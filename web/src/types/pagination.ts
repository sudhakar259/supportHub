export interface PaginationMeta {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}
