type BaseQuery = IPaginationParams;

interface IPaginationParams {
  page?: number;
  pageSize?: number;
}

interface ICreate<T> {
  variables: T;
  createdBy: string;
  transactionalEntityManager?: EntityManager;
}

interface IUpdate<T> {
  variables: T;
  updatedBy: string;
  transactionalEntityManager?: EntityManager;
}
