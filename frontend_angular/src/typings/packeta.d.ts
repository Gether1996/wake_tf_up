declare namespace Packeta {
  namespace Widget {
    interface Point {
      id: string;
      name: string;
      street: string;
      city: string;
      zip: string;
    }

    function pick(
      apiKey: string,
      callback: (point: Point | null) => void,
      options?: { country?: string; language?: string }
    ): void;
  }
}
