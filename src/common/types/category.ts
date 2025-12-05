export interface ICategoryQueries extends BaseQuery {
  parent?: boolean;
  search?: string;
  parentIds?: string[];
}
