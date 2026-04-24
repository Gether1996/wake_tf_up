from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse
from django import forms
from .models import Subscriber, NewsletterPopupStat, NewsletterTemplate, DiscountCodeTemplate, NewsletterImage, EventsTemplate, BlogsTemplate
from .email_utils import build_unsubscribe_url, get_frontend_base_url
from datetime import datetime
import re
from django.template import Template, Context
from core.admin_mixins import SellerHiddenAdminMixin


class DiscountCodeChoiceField(forms.ModelChoiceField):
    """Custom ModelChoiceField with formatted labels for discount codes"""
    def label_from_instance(self, obj):
        return f"{obj.code} - {obj.discount_percentage}% (platný do: {obj.valid_until.strftime('%d.%m.%Y %H:%M') if obj.valid_until else 'neobmedzene'})"


class DiscountCodeTemplateAdminForm(forms.ModelForm):
    """Admin form that keeps auto-filled fields readonly but editable via JS"""

    class Meta:
        model = DiscountCodeTemplate
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ('discount_code', 'discount_percentage', 'valid_until'):
            field = self.fields.get(field_name)
            if not field:
                continue
            widget = field.widget
            if hasattr(widget, 'widgets'):  # SplitDateTimeWidget etc.
                for subwidget in widget.widgets:
                    subwidget.attrs['readonly'] = 'readonly'
                widget.attrs = getattr(widget, 'attrs', {})
                widget.attrs['data-readonly'] = 'true'
            else:
                widget.attrs['readonly'] = 'readonly'


def clean_text_for_email(text):
    """Remove ONLY problematic bidirectional/format control characters, keep Slovak chars"""
    if not text:
        return text
    
    import re
    # Remove: LRE, RLE, PDF, LRO, RLO, LRI, RLI, FSI, PDI
    cleaned = re.sub(r'[\u202A-\u202E\u2066-\u2069]', '', text)
    # Also try to encode/decode to catch any remaining problematic chars
    try:
        cleaned.encode('utf-8').decode('utf-8')
    except UnicodeEncodeError:
        # If still fails, remove all non-ASCII-compatible chars
        cleaned = cleaned.encode('utf-8', errors='ignore').decode('utf-8')
    return cleaned


def get_request_language_code(request):
    return getattr(request, 'LANGUAGE_CODE', 'sk')


def get_active_subscribers_queryset(request, queryset, selected_only=False):
    active_queryset = queryset.filter(is_active=True)
    skipped_count = queryset.count() - active_queryset.count()
    return active_queryset, skipped_count


def get_newsletter_context(subscriber_email, base_url, language_code, **extra_context):
    context = {
        'unsubscribe_url': build_unsubscribe_url(subscriber_email, language_code, base_url),
        'site_url': base_url,
        'email': subscriber_email,
    }
    context.update(extra_context)
    return context


@admin.register(Subscriber)
class SubscriberAdmin(SellerHiddenAdminMixin, admin.ModelAdmin):
    list_display = ('email', 'status_badge', 'subscribed_at', 'unsubscribed_at')
    list_filter = ('is_active', 'subscribed_at')
    search_fields = ('email',)
    readonly_fields = ('subscribed_at', 'unsubscribed_at')
    date_hierarchy = 'subscribed_at'
    list_per_page = 50
    actions = ['activate_subscribers', 'deactivate_subscribers', 'send_bulk_newsletter_news', 'send_bulk_discount_codes', 'send_bulk_events', 'send_bulk_blogs']
    
    def status_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: green; font-weight: bold;">● Active</span>'
            )
        return format_html(
            '<span style="color: red;">● Unsubscribed</span>'
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'is_active'
    
    # Actions
    def activate_subscribers(self, request, queryset):
        queryset.update(is_active=True, unsubscribed_at=None)
    activate_subscribers.short_description = "Aktivovať vybrané emaily"
    
    def deactivate_subscribers(self, request, queryset):
        from datetime import datetime
        queryset.update(is_active=False, unsubscribed_at=datetime.now())
    deactivate_subscribers.short_description = "Deaktivovať vybrané emaily"
    
    def send_bulk_newsletter_news(self, request, queryset):
        """Send newsletter news HTML template to selected subscribers"""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        # Get the newsletter template
        try:
            template = NewsletterTemplate.objects.get(pk=1)
        except NewsletterTemplate.DoesNotExist:
            self.message_user(
                request, 
                "Newsletter šablóna neexistuje. Vytvorte ju najprv.", 
                level=messages.ERROR
            )
            return
        
        if not template.content_html:
            self.message_user(
                request,
                "Newsletter šablóna nemá žiadny HTML obsah.",
                level=messages.ERROR
            )
            return
        
        queryset, skipped_count = get_active_subscribers_queryset(request, queryset, selected_only=True)
        if skipped_count:
            self.message_user(
                request,
                f"Z vybranych subscriberov bolo preskocenych neaktivnych odberatelov: {skipped_count}",
                level=messages.WARNING
            )
        if not queryset.exists():
            self.message_user(request, "Medzi oznacenymi subscribermi nie je ziadny aktivny odberatel.", level=messages.ERROR)
            return

        sent_count = 0
        failed_count = 0
        
        # Get base URL and language code from request
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)
        
        # Debug: Check subject in database
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[NEWSLETTER DEBUG] Original subject from DB: {repr(template.subject)}")
        logger.warning(f"[NEWSLETTER DEBUG] Subject bytes: {template.subject.encode('utf-8')}")
        
        for subscriber in queryset:
            try:
                # Plain text fallback (MUST be clean, no problematic Unicode)
                plain_text = f"""
Ahoj,

Prinášame vám novinky z WAKE TF UP. Prečítajte si článoky na našom webe:

{base_url}/{language_code}/blog

Ďakujeme za vašu pozornosť!

WAKE TF UP tím

Odhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}
                """.strip()
                
                # Replace placeholders in HTML using Django template
                html_content = template.content_html
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                
                # Render template variables and clean HTML
                html_content = Template(html_content).render(Context(get_newsletter_context(subscriber.email, base_url, language_code)))
                html_content = clean_text_for_email(html_content)
                subject = template.subject
                
                # Create email EXACTLY like accounts/views.py does it
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[subscriber.email],
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(
                    request,
                    f"Nepodarilo sa odoslať na {subscriber.email}: {str(e)}",
                    level=messages.WARNING
                )
        
        # Update last_sent timestamp
        template.last_sent = datetime.now()
        template.save()
        
        self.message_user(
            request,
            f"Úspešne odoslané na {sent_count} emailov. Neúspešných: {failed_count}",
            level=messages.SUCCESS
        )
    send_bulk_newsletter_news.short_description = "Hromadný email s novinkami"
    
    def send_bulk_discount_codes(self, request, queryset):
        """Send discount code HTML template to selected subscribers"""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        # Get the discount code template
        try:
            template = DiscountCodeTemplate.objects.get(pk=1)
        except DiscountCodeTemplate.DoesNotExist:
            self.message_user(
                request,
                "Šablóna zľavového kódu neexistuje. Vytvorte ju najprv.",
                level=messages.ERROR
            )
            return
        
        if not template.content_html:
            self.message_user(
                request,
                "Šablóna zľavového kódu nemá žiadny HTML obsah.",
                level=messages.ERROR
            )
            return
        
        queryset, skipped_count = get_active_subscribers_queryset(request, queryset, selected_only=True)
        if skipped_count:
            self.message_user(
                request,
                f"Z vybranych subscriberov bolo preskocenych neaktivnych odberatelov: {skipped_count}",
                level=messages.WARNING
            )
        if not queryset.exists():
            self.message_user(request, "Medzi oznacenymi subscribermi nie je ziadny aktivny odberatel.", level=messages.ERROR)
            return

        sent_count = 0
        failed_count = 0
        
        # Get base URL and language code from request
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)
        
        for subscriber in queryset:
            try:
                # Plain text fallback (MUST be clean, no problematic Unicode)
                discount_code_clean = clean_text_for_email(template.discount_code or '')
                plain_text = f"""
Ahoj,

Máte špeciálnu zľavu! 

Zľavový kód: {discount_code_clean}
Zľava: {template.discount_percentage or ''}%
Platný do: {template.valid_until.strftime('%d.%m.%Y') if template.valid_until else 'neznámo'}

Nakupovať: {base_url}/{language_code}/shop

Odhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}
                """.strip()
                
                # Replace placeholders in HTML using Django template
                html_content = template.content_html
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                
                # Render template variables and clean HTML
                html_content = Template(html_content).render(Context(get_newsletter_context(
                    subscriber.email,
                    base_url,
                    language_code,
                    discount_code=template.discount_code or '',
                    discount_percentage=str(template.discount_percentage or ''),
                    valid_until=template.valid_until.strftime('%d.%m.%Y') if template.valid_until else '',
                )))
                html_content = clean_text_for_email(html_content)
                subject = template.subject
                
                # Create email EXACTLY like accounts/views.py does it
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[subscriber.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(
                    request,
                    f"Nepodarilo sa odoslať na {subscriber.email}: {str(e)}",
                    level=messages.WARNING
                )
        
        # Update last_sent timestamp
        template.last_sent = datetime.now()
        template.save()
        
        self.message_user(
            request,
            f"Úspešne odoslané na {sent_count} emailov. Neúspešných: {failed_count}",
            level=messages.SUCCESS
        )
    send_bulk_discount_codes.short_description = "Hromadný email so zľavovými kódmi"

    def send_bulk_events(self, request, queryset):
        """Send events newsletter HTML template to selected subscribers"""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        try:
            template = EventsTemplate.objects.get(pk=1)
        except EventsTemplate.DoesNotExist:
            self.message_user(request, "Eventy šablóna neexistuje. Vytvorte ju najprv.", level=messages.ERROR)
            return

        if not template.content_html:
            self.message_user(request, "Eventy šablóna nemá žiadny HTML obsah.", level=messages.ERROR)
            return

        queryset, skipped_count = get_active_subscribers_queryset(request, queryset, selected_only=True)
        if skipped_count:
            self.message_user(
                request,
                f"Z vybranych subscriberov bolo preskocenych neaktivnych odberatelov: {skipped_count}",
                level=messages.WARNING
            )
        if not queryset.exists():
            self.message_user(request, "Medzi oznacenymi subscribermi nie je ziadny aktivny odberatel.", level=messages.ERROR)
            return

        sent_count = 0
        failed_count = 0
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)

        for subscriber in queryset:
            try:
                plain_text = f"Ahoj,\n\nPozrite si nadchádzajúce eventy na:\n{base_url}/{language_code}/events\n\nOdhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}".strip()
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                html_content = Template(template.content_html).render(Context(get_newsletter_context(subscriber.email, base_url, language_code)))
                html_content = clean_text_for_email(html_content)
                email = EmailMultiAlternatives(
                    subject=template.subject,
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[subscriber.email],
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(request, f"Nepodarilo sa odoslať na {subscriber.email}: {str(e)}", level=messages.WARNING)

        template.last_sent = datetime.now()
        template.save()
        self.message_user(request, f"Úspešne odoslané na {sent_count} emailov. Neúspešných: {failed_count}", level=messages.SUCCESS)

    send_bulk_events.short_description = "Hromadný email o eventoch"

    def send_bulk_blogs(self, request, queryset):
        """Send blogs newsletter HTML template to selected subscribers"""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        try:
            template = BlogsTemplate.objects.get(pk=1)
        except BlogsTemplate.DoesNotExist:
            self.message_user(request, "Blogy šablóna neexistuje. Vytvorte ju najprv.", level=messages.ERROR)
            return

        if not template.content_html:
            self.message_user(request, "Blogy šablóna nemá žiadny HTML obsah.", level=messages.ERROR)
            return

        queryset, skipped_count = get_active_subscribers_queryset(request, queryset, selected_only=True)
        if skipped_count:
            self.message_user(
                request,
                f"Z vybranych subscriberov bolo preskocenych neaktivnych odberatelov: {skipped_count}",
                level=messages.WARNING
            )
        if not queryset.exists():
            self.message_user(request, "Medzi oznacenymi subscribermi nie je ziadny aktivny odberatel.", level=messages.ERROR)
            return

        sent_count = 0
        failed_count = 0
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)

        for subscriber in queryset:
            try:
                plain_text = f"Ahoj,\n\nPozrite si nové blogy na:\n{base_url}/{language_code}/blog\n\nOdhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}".strip()
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                html_content = Template(template.content_html).render(Context(get_newsletter_context(subscriber.email, base_url, language_code)))
                html_content = clean_text_for_email(html_content)
                email = EmailMultiAlternatives(
                    subject=template.subject,
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[subscriber.email],
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(request, f"Nepodarilo sa odoslať na {subscriber.email}: {str(e)}", level=messages.WARNING)

        template.last_sent = datetime.now()
        template.save()
        self.message_user(request, f"Úspešne odoslané na {sent_count} emailov. Neúspešných: {failed_count}", level=messages.SUCCESS)

    send_bulk_blogs.short_description = "Hromadný email o blogoch"


@admin.register(NewsletterPopupStat)
class NewsletterPopupStatAdmin(SellerHiddenAdminMixin, admin.ModelAdmin):
    """Admin for newsletter popup statistics - READ ONLY view"""
    
    fieldsets = (
        ('📊 Newsletter Popup Štatistiky', {
            'fields': ('shown_count', 'subscribed_count', 'dismissed_count', 'last_updated'),
            'description': '⚠️ Tieto štatistiky sú iba na zobrazenie. Hodnoty sa aktualizujú automaticky z frontend interakcií.'
        }),
        ('📈 Vypočítané hodnoty', {
            'fields': ('total_interactions_display', 'conversion_rate_display'),
            'description': 'Automaticky vypočítané metriky na základe vyššie uvedených počtov'
        }),
    )
    
    readonly_fields = ('shown_count', 'subscribed_count', 'dismissed_count', 'last_updated', 
                      'total_interactions_display', 'conversion_rate_display')
    
    def has_add_permission(self, request):
        """Only one instance allowed"""
        return not NewsletterPopupStat.objects.exists()
    
    def has_change_permission(self, request, obj=None):
        """Read-only view - no changes allowed"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion"""
        return False
    
    def total_interactions_display(self, obj):
        """Display total interactions (subscribed + dismissed)"""
        return obj.total_interactions
    total_interactions_display.short_description = 'Celkový počet interakcií (Subscribe + Dismiss)'
    
    def conversion_rate_display(self, obj):
        """Display conversion rate as percentage"""
        return format_html(
            '<strong style="color: {};">{:.2f}%</strong>',
            'green' if obj.conversion_rate >= 10 else 'orange' if obj.conversion_rate >= 5 else 'red',
            obj.conversion_rate
        )
    conversion_rate_display.short_description = 'Konverzný pomer (Subscribe / Interakcie)'
    
    def changelist_view(self, request, extra_context=None):
        """Redirect to single instance edit page"""
        stats = NewsletterPopupStat.load()
        from django.shortcuts import redirect
        return redirect('admin:newsletter_newsletterpopupstat_change', stats.pk)


class SingletonModelAdmin(SellerHiddenAdminMixin, admin.ModelAdmin):
    """Base admin for singleton models - only one instance allowed"""
    
    def has_add_permission(self, request):
        # Allow add only if no instance exists
        return not self.model.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion in admin
        return False


@admin.register(NewsletterTemplate)
class NewsletterTemplateAdmin(SingletonModelAdmin):
    fieldsets = (
        ('Email Settings', {
            'fields': ('subject',)
        }),
        ('Content', {
            'fields': ('content_html',),
            'description': 'Vložte HTML email šablónu. Dostupné Jinja2 premenné: {{site_url}} (automaticky generované z FRONTEND_URL), {{unsubscribe_url}} (jednostranný unsubscribe link), {{discount_code}}, {{discount_percentage}}, {{valid_until}}. Server automaticky nahradí tieto premenné reálnymi hodnotami.<br><br><strong>Príklady:</strong><br>&lt;a href="{{site_url}}/produkty"&gt;Produkty&lt;/a&gt;<br>&lt;a href="{{unsubscribe_url}}"&gt;Odhlásiť sa&lt;/a&gt;'
        }),
        ('Statistics', {
            'fields': ('last_sent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('last_sent', 'created_at', 'updated_at')
    
    def save_model(self, request, obj, form, change):
        """Clean Unicode characters before saving"""
        obj.full_clean()  # This calls obj.clean()
        super().save_model(request, obj, form, change)
    
    actions = ['send_to_all_subscribers']
    
    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        
        # For singleton models, always use pk=1
        try:
            obj = self.model.objects.get(pk=1)
            if obj and obj.content_html:
                preview_url = reverse('newsletter:newsletter_template_preview', args=[1])
                extra_context['preview_url'] = preview_url
                extra_context['show_preview'] = True
        except self.model.DoesNotExist:
            pass
        
        # Add available images to context (limit to 50 recent, only load necessary fields)
        extra_context['newsletter_images'] = NewsletterImage.objects.only(
            'id', 'title', 'image', 'created_at'
        ).order_by('-created_at')[:50]
        
        return super().changeform_view(request, object_id, form_url, extra_context)
    
    def send_to_all_subscribers(self, request, queryset):
        """Send newsletter to all active subscribers"""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        template = queryset.first()
        if not template:
            self.message_user(request, "No template selected", level=messages.ERROR)
            return
        
        if not template.content_html:
            self.message_user(request, "Template has no content", level=messages.ERROR)
            return
        
        # Get all active subscribers
        subscribers = Subscriber.objects.filter(is_active=True)
        
        if not subscribers.exists():
            self.message_user(request, "No active subscribers found", level=messages.ERROR)
            return
        
        sent_count = 0
        failed_count = 0
        
        # Get base URL and language code from request
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)
        
        for subscriber in subscribers:
            try:
                # Plain text fallback (MUST be clean, no problematic Unicode)
                plain_text = f"""
Ahoj,

Prinášame vám novinky z WAKE TF UP. Prečítajte si články na našom webe:

{base_url}/{language_code}/blog

Ďakujeme za vašu pozornosť!

WAKE TF UP tím

Odhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}
                """.strip()
                
                # Replace placeholders in HTML
                html_content = template.content_html
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                
                # Clean HTML content and subject from problematic Unicode characters
                html_content = Template(html_content).render(Context(get_newsletter_context(subscriber.email, base_url, language_code)))
                html_content = clean_text_for_email(html_content)
                subject = template.subject                
                # Create email exactly like accounts/views.py does it
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[subscriber.email],
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(
                    request,
                    f"Failed to send to {subscriber.email}: {str(e)}",
                    level=messages.WARNING
                )
        
        # Update last_sent timestamp
        template.last_sent = datetime.now()
        template.save()
        
        self.message_user(
            request,
            f"Successfully sent to {sent_count} subscribers. Failed: {failed_count}",
            level=messages.SUCCESS
        )
    
    send_to_all_subscribers.short_description = "Odoslať newsletter všetkým aktivným odberateľom"


@admin.register(DiscountCodeTemplate)
class DiscountCodeTemplateAdmin(SingletonModelAdmin):
    form = DiscountCodeTemplateAdminForm
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Customize the discount code dropdown to show detailed info"""
        if db_field.name == "selected_discount_code":
            from loyalty.models import DiscountCode
            kwargs["queryset"] = DiscountCode.objects.filter(is_active=True).order_by('-created_at')
            kwargs["required"] = False
            # Use custom choice field with formatted labels
            return DiscountCodeChoiceField(queryset=kwargs["queryset"], required=False)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    fieldsets = (
        ('Email Settings', {
            'fields': ('subject',)
        }),
        ('Discount Code Selection', {
            'fields': ('selected_discount_code',),
            'description': 'Vyberte existujúci zľavový kód. Informácie sa automaticky vyplnia po uložení.'
        }),
        ('Discount Information (Auto-filled)', {
            'fields': ('discount_code', 'discount_percentage', 'valid_until'),
            'description': 'Tieto polia sa automaticky vyplnia po uložení.'
        }),
        ('Content', {
            'fields': ('content_html',),
            'description': 'Vložte HTML email šablónu. Dostupné Jinja2 premenné: {{site_url}} (automaticky z FRONTEND_URL), {{unsubscribe_url}} (jednostranný unsubscribe), {{discount_code}}, {{discount_percentage}}, {{valid_until}}. Server automaticky nahradí všetky premenné reálnymi hodnotami.<br><br><strong>Príklady:</strong><br>&lt;a href=\"{{site_url}}/produkty\"&gt;Produkty&lt;/a&gt;<br>&lt;a href=\"{{unsubscribe_url}}\"&gt;Odhlásiť sa&lt;/a&gt;'
        }),
        ('Statistics', {
            'fields': ('last_sent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('last_sent', 'created_at', 'updated_at')
    
    def save_model(self, request, obj, form, change):
        """Auto-fill discount fields from selected discount code and clean Unicode"""
        if obj.selected_discount_code:
            obj.discount_code = obj.selected_discount_code.code
            obj.discount_percentage = int(obj.selected_discount_code.discount_percentage)
            obj.valid_until = obj.selected_discount_code.valid_until
        else:
            obj.discount_code = ''
            obj.discount_percentage = None
            obj.valid_until = None
        
        obj.full_clean()  # This calls obj.clean()
        super().save_model(request, obj, form, change)
    
    actions = ['send_to_all_subscribers']
    
    class Media:
        js = ('newsletter/admin/js/discount_code_selector.js',)
    
    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        
        # For singleton models, always use pk=1
        try:
            obj = self.model.objects.get(pk=1)
            if obj and obj.content_html:
                preview_url = reverse('newsletter:discount_template_preview', args=[1])
                extra_context['preview_url'] = preview_url
                extra_context['show_preview'] = True
        except self.model.DoesNotExist:
            pass
        
        # Add available images to context (limit to 50 recent, only load necessary fields)
        extra_context['newsletter_images'] = NewsletterImage.objects.only(
            'id', 'title', 'image', 'created_at'
        ).order_by('-created_at')[:50]
        
        return super().changeform_view(request, object_id, form_url, extra_context)
    
    def send_to_all_subscribers(self, request, queryset):
        """Send discount code email to all active subscribers"""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        template = queryset.first()
        if not template:
            self.message_user(request, "No template selected", level=messages.ERROR)
            return
        
        if not template.content_html:
            self.message_user(request, "Template has no content", level=messages.ERROR)
            return
        
        # Get all active subscribers
        subscribers = Subscriber.objects.filter(is_active=True)
        
        if not subscribers.exists():
            self.message_user(request, "No active subscribers found", level=messages.ERROR)
            return
        
        sent_count = 0
        failed_count = 0
        
        # Get base URL and language code from request
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)
        
        for subscriber in subscribers:
            try:
                # Plain text fallback (MUST be clean, no problematic Unicode)
                discount_code_clean = clean_text_for_email(template.discount_code or '')
                plain_text = f"""
Ahoj,

Máte špeciálnu zľavu! 

Zľavový kód: {discount_code_clean}
Zľava: {template.discount_percentage or ''}%
Platný do: {template.valid_until.strftime('%d.%m.%Y') if template.valid_until else 'neznámo'}

Nakupovať: {base_url}/{language_code}/shop

Odhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}
                """.strip()
                
                # Replace placeholders in HTML using Django template
                html_content = template.content_html
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                
                # Render template variables and clean HTML
                html_content = Template(html_content).render(Context(get_newsletter_context(
                    subscriber.email,
                    base_url,
                    language_code,
                    discount_code=template.discount_code or '',
                    discount_percentage=str(template.discount_percentage or ''),
                    valid_until=template.valid_until.strftime('%d.%m.%Y') if template.valid_until else '',
                )))
                html_content = clean_text_for_email(html_content)
                subject = template.subject
                
                # Create email exactly like accounts/views.py does it
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[subscriber.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(
                    request,
                    f"Failed to send to {subscriber.email}: {str(e)}",
                    level=messages.WARNING
                )
        
        # Update last_sent timestamp
        template.last_sent = datetime.now()
        template.save()
        
        self.message_user(
            request,
            f"Successfully sent to {sent_count} subscribers. Failed: {failed_count}",
            level=messages.SUCCESS
        )
    
    send_to_all_subscribers.short_description = "Send discount email to all active subscribers"
    



@admin.register(NewsletterImage)
class NewsletterImageAdmin(SellerHiddenAdminMixin, admin.ModelAdmin):
    list_display = ('title', 'image_preview', 'created_at', 'copy_url_button')
    list_filter = ('created_at',)
    search_fields = ('title', 'alt_text', 'caption')
    readonly_fields = ('image_preview', 'created_at', 'updated_at', 'full_url_display')
    
    fieldsets = (
        ('Image Information', {
            'fields': ('title', 'image', 'image_preview', 'alt_text', 'caption')
        }),
        ('URL for Email', {
            'fields': ('full_url_display',),
            'description': 'Copy this URL to use in your newsletter HTML'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 100px; max-width: 200px;" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = 'Preview'
    
    def copy_url_button(self, obj):
        if obj.image:
            url = obj.image.url
            return format_html(
                '<button onclick="navigator.clipboard.writeText(\'{}\'); '
                'alert(\'URL copied to clipboard!\'); return false;" '
                'style="padding: 5px 10px; cursor: pointer;">📋 Copy URL</button>',
                url
            )
        return "-"
    copy_url_button.short_description = 'Copy URL'
    
    def full_url_display(self, obj):
        if obj.image:
            url = obj.image.url
            return format_html(
                '<div style="background: #f5f5f5; padding: 10px; margin: 10px 0; '
                'border: 1px solid #ddd; border-radius: 4px;">'
                '<strong>Relative URL:</strong><br>'
                '<code style="background: white; padding: 5px; display: block; '
                'margin: 5px 0; user-select: all;">{}</code>'
                '<button onclick="navigator.clipboard.writeText(\'{}\'); '
                'alert(\'URL copied!\'); return false;" '
                'style="margin-top: 10px; padding: 8px 15px; cursor: pointer; '
                'background: #417690; color: white; border: none; border-radius: 3px;">'
                '📋 Copy URL</button>'
                '<br><br>'
                '<em style="color: #666;">Note: For emails, prepend your domain: '
                'https://yourdomain.com{}</em>'
                '</div>',
                url, url, url
            )
        return "No image uploaded"
    full_url_display.short_description = 'Image URL'


PLACEHOLDER_DOCS = (
    'Vložte HTML email šablónu. V HTML obsahu môžete použiť tieto placeholdery:<br>'
    '<strong>{{site_url}}</strong> - nahradi sa za URL vašej stránky (napr. https://wake-tf-up.sk)<br>'
    '<strong>{{unsubscribe_url}}</strong> - automaticky sa nahradi kompletným unsubscribe linkom s emailom príjemcu<br>'
    '<br><strong>Príklady:</strong><br>'
    '&lt;a href="{{site_url}}"&gt;Navštíviť obchod&lt;/a&gt;<br>'
    '&lt;a href="{{unsubscribe_url}}"&gt;Odhlásiť sa&lt;/a&gt;<br>'
    '<br>URL sa automaticky vygeneruje z nastavení (FRONTEND_URL).'
)


@admin.register(EventsTemplate)
class EventsTemplateAdmin(SingletonModelAdmin):
    fieldsets = (
        ('Email Settings', {
            'fields': ('subject',)
        }),
        ('Content', {
            'fields': ('content_html',),
            'description': PLACEHOLDER_DOCS
        }),
        ('Statistics', {
            'fields': ('last_sent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('last_sent', 'created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        obj.full_clean()
        super().save_model(request, obj, form, change)

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        try:
            obj = self.model.objects.get(pk=1)
            if obj and obj.content_html:
                preview_url = reverse('newsletter:events_template_preview', args=[1])
                extra_context['preview_url'] = preview_url
                extra_context['show_preview'] = True
        except self.model.DoesNotExist:
            pass
        extra_context['newsletter_images'] = NewsletterImage.objects.only(
            'id', 'title', 'image', 'created_at'
        ).order_by('-created_at')[:50]
        return super().changeform_view(request, object_id, form_url, extra_context)

    actions = ['send_to_all_subscribers']

    def send_to_all_subscribers(self, request, queryset):
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        template = EventsTemplate.load()
        if not template.content_html:
            self.message_user(request, "Eventy šablóna nemá žiadny HTML obsah.", level=messages.ERROR)
            return

        from .models import Subscriber
        subscribers = Subscriber.objects.filter(is_active=True)
        sent_count = 0
        failed_count = 0
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)

        for subscriber in subscribers:
            try:
                plain_text = f"Ahoj,\n\nPozrite si nadchádzajúce eventy na:\n{base_url}/{language_code}/events\n\nOdhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}".strip()
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                html_content = Template(template.content_html).render(Context(get_newsletter_context(subscriber.email, base_url, language_code)))
                html_content = clean_text_for_email(html_content)
                email = EmailMultiAlternatives(subject=template.subject, body=plain_text, from_email=settings.DEFAULT_FROM_EMAIL, to=[subscriber.email])
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(request, f"Nepodarilo sa odoslať na {subscriber.email}: {str(e)}", level=messages.WARNING)

        template.last_sent = datetime.now()
        template.save()
        self.message_user(request, f"Úspešne odoslané na {sent_count} odberateľov. Neúspešných: {failed_count}", level=messages.SUCCESS)

    send_to_all_subscribers.short_description = "Odoslať newsletter všetkým aktivným odberateľom"


@admin.register(BlogsTemplate)
class BlogsTemplateAdmin(SingletonModelAdmin):
    fieldsets = (
        ('Email Settings', {
            'fields': ('subject',)
        }),
        ('Content', {
            'fields': ('content_html',),
            'description': PLACEHOLDER_DOCS
        }),
        ('Statistics', {
            'fields': ('last_sent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('last_sent', 'created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        obj.full_clean()
        super().save_model(request, obj, form, change)

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        try:
            obj = self.model.objects.get(pk=1)
            if obj and obj.content_html:
                preview_url = reverse('newsletter:blogs_template_preview', args=[1])
                extra_context['preview_url'] = preview_url
                extra_context['show_preview'] = True
        except self.model.DoesNotExist:
            pass
        extra_context['newsletter_images'] = NewsletterImage.objects.only(
            'id', 'title', 'image', 'created_at'
        ).order_by('-created_at')[:50]
        return super().changeform_view(request, object_id, form_url, extra_context)

    actions = ['send_to_all_subscribers']

    def send_to_all_subscribers(self, request, queryset):
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings

        template = BlogsTemplate.load()
        if not template.content_html:
            self.message_user(request, "Blogy šablóna nemá žiadny HTML obsah.", level=messages.ERROR)
            return

        from .models import Subscriber
        subscribers = Subscriber.objects.filter(is_active=True)
        sent_count = 0
        failed_count = 0
        base_url = get_frontend_base_url()
        language_code = get_request_language_code(request)

        for subscriber in subscribers:
            try:
                plain_text = f"Ahoj,\n\nPozrite si nové blogy na:\n{base_url}/{language_code}/blog\n\nOdhlásiť sa: {base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}".strip()
                unsubscribe_link = build_unsubscribe_url(subscriber.email, language_code, base_url)
                plain_text = plain_text.replace(
                    f"{base_url}/{language_code}/newsletter/unsubscribe?email={subscriber.email}",
                    unsubscribe_link,
                )
                html_content = Template(template.content_html).render(Context(get_newsletter_context(subscriber.email, base_url, language_code)))
                html_content = clean_text_for_email(html_content)
                email = EmailMultiAlternatives(subject=template.subject, body=plain_text, from_email=settings.DEFAULT_FROM_EMAIL, to=[subscriber.email])
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                sent_count += 1
            except Exception as e:
                failed_count += 1
                self.message_user(request, f"Nepodarilo sa odoslať na {subscriber.email}: {str(e)}", level=messages.WARNING)

        template.last_sent = datetime.now()
        template.save()
        self.message_user(request, f"Úspešne odoslané na {sent_count} odberateľov. Neúspešných: {failed_count}", level=messages.SUCCESS)

    send_to_all_subscribers.short_description = "Odoslať newsletter všetkým aktivným odberateľom"
