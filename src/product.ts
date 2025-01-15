// in cents
const TANGHULU_PRICE = 300n; // FIXME: actual prices please
const DUMPLING_PRICE = 600n;

export enum Item {
  Tanghulu,
  Dumpling,
}

export interface Customer {
  name: string;
  email: string;
  reach?: string;
}

export interface Order {
  tanghulu: bigint;
  dumpling: bigint;
}

export interface Payment {
  square_id: string;
  cost: bigint;
  last_4: string;
}

export const price = (item: Item): bigint => {
  switch (item) {
    case Item.Tanghulu:
      return TANGHULU_PRICE;
    case Item.Dumpling:
      return DUMPLING_PRICE;
  }
};

export interface SquareFeeOptions {
  percent: number;
  flat?: bigint;
}

export const withSquareFee = (
  price: bigint,
  options: SquareFeeOptions = { percent: 0.028, flat: 30n },
): bigint => {
  const { flat, percent } = options;

  return BigInt(Math.ceil(Number(price + (flat ?? 0n)) / (1 - percent)));
};
