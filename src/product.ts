// in cents
const TANGHULU_PRICE = 100n; // FIXME: actual prices please
const DUMPLING_PRICE = 150n;

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

export const price = (item: Item): bigint => {
  switch (item) {
    case Item.Tanghulu:
      return TANGHULU_PRICE;
    case Item.Dumpling:
      return DUMPLING_PRICE;
  }
};
