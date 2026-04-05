import logging
import os
from datetime import datetime


class DailyNamedFileHandler(logging.FileHandler):
    """
    Write logs into files named YYYY-MM-DD.log inside the configured directory.
    """

    def __init__(self, directory, encoding='utf-8', **kwargs):
        self.directory = directory
        os.makedirs(self.directory, exist_ok=True)
        self.current_date = datetime.now().date()
        filename = self._build_filename(self.current_date)
        super().__init__(filename, encoding=encoding, **kwargs)

    def _build_filename(self, date_value):
        return os.path.join(self.directory, f"{date_value.strftime('%Y-%m-%d')}.log")

    def emit(self, record):
        record_date = datetime.fromtimestamp(record.created).date()
        if record_date != self.current_date:
            self.acquire()
            try:
                if record_date != self.current_date:
                    self.current_date = record_date
                    self.baseFilename = os.path.abspath(self._build_filename(record_date))
                    if self.stream:
                        self.stream.close()
                    self.stream = self._open()
            finally:
                self.release()

        super().emit(record)
