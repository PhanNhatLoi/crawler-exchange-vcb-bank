export class CrawlDataResponse {
  currencyUnit: string;
  result: CrawlDataTable[];
  source: string;
  updatedDate: string;
}

export class CrawlDataTable {
  currencyCode: string;
  currencyNote: number;
  currencyName: number;
  buyCash: number;
  buyTransfer: number;
  sellCash: number;
  sellTransfer: number;
}
