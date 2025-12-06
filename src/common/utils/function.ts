export const createPaginatedResponse = <T>(
  pagination: Partial<{ page: number; pageSize: number }> | undefined,
  // result: [T[], number],
  total: number,
  result: T[],
) => {
  const { page = 1, pageSize = 10 } = pagination ?? {};
  // const [items, totalItems] = result;

  const totalPages = Math.ceil(total / pageSize);

  const isPaginationDisabled = !pageSize || pageSize <= 0;

  const currentPage = isPaginationDisabled ? 1 : Math.max(1, page);
  const itemsPerPage = isPaginationDisabled ? total : pageSize;
  const finalTotalPages = isPaginationDisabled ? 1 : totalPages;
  const hasNextPage = isPaginationDisabled ? false : currentPage < totalPages;
  const hasPreviousPage = isPaginationDisabled ? false : currentPage > 1;

  return {
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      currentPage,
      itemsPerPage,
      totalItems: total,
      totalPages: finalTotalPages,
    },
    data: result,
  };
};

export const getSkipTakeParams = (
  params: IPaginationParams,
): { take?: number; skip?: number } => {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  const skip = (page - 1) * pageSize;

  return {
    take: pageSize,
    skip: skip,
  };
};
