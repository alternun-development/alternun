import type {
  BaseRecord,
  CreateManyParams,
  CreateParams,
  CustomParams,
  DataProvider,
  DeleteManyParams,
  DeleteOneParams,
  GetListParams,
  GetManyParams,
  GetOneParams,
  UpdateManyParams,
  UpdateParams,
} from '@refinedev/core';
import { getAccessToken } from '../auth/oidc-client';
import { adminEnv } from '../config/env';
import { getAdminResource } from '../resources/catalog';

type MetaBag = Record<string, unknown> | undefined;
type ListQueryArgs = Pick<GetListParams, 'filters' | 'pagination' | 'sorters'>;

class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

function resolveEndpoint(resource: string, meta?: MetaBag): string {
  const metaEndpoint =
    meta && typeof meta.endpoint === 'string' && meta.endpoint.length > 0
      ? meta.endpoint
      : undefined;

  if (metaEndpoint) {
    return metaEndpoint;
  }

  return getAdminResource(resource).meta.endpoint;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
}

function stringifyFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(',');
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildListQuery({ pagination, sorters, filters }: ListQueryArgs): string {
  const query = new URLSearchParams();

  if (pagination?.currentPage) {
    query.set('page', String(pagination.currentPage));
  }

  if (pagination?.pageSize) {
    query.set('perPage', String(pagination.pageSize));
  }

  const primarySorter = sorters?.[0];
  if (primarySorter && 'field' in primarySorter && primarySorter.field) {
    query.set('sort', String(primarySorter.field));
    query.set('order', primarySorter.order === 'desc' ? 'desc' : 'asc');
  }

  for (const filter of filters ?? []) {
    if (!('field' in filter) || !filter.field) {
      continue;
    }

    query.append(String(filter.field), stringifyFilterValue(filter.value));
  }

  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const errorBody = (await response.json()) as { message?: string; error?: string };
      message = errorBody.message ?? errorBody.error ?? message;
    } catch {
      // Keep the default message when the body is not JSON.
    }

    throw new AdminApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function authorizedFetch<T>(
  url: string,
  init?: RequestInit
): Promise<{ body: T; response: Response }> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);

  headers.set('Accept', 'application/json');

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const body = await parseResponse<T>(response);
  return { body, response };
}

function normalizeListPayload<TData extends BaseRecord>(
  payload: unknown,
  response: Response
): { data: TData[]; total: number } {
  if (Array.isArray(payload)) {
    const totalHeader = Number(response.headers.get('x-total-count') ?? payload.length);
    return {
      data: payload as TData[],
      total: Number.isFinite(totalHeader) ? totalHeader : payload.length,
    };
  }

  if (typeof payload === 'object' && payload !== null) {
    const maybeData = payload as {
      data?: unknown;
      items?: unknown;
      total?: number;
      pagination?: { total?: number };
      meta?: { total?: number };
    };

    const collection = Array.isArray(maybeData.data)
      ? maybeData.data
      : Array.isArray(maybeData.items)
      ? maybeData.items
      : [];
    const total =
      maybeData.total ??
      maybeData.pagination?.total ??
      maybeData.meta?.total ??
      Number(response.headers.get('x-total-count') ?? collection.length);

    return {
      data: collection as TData[],
      total,
    };
  }

  return {
    data: [],
    total: 0,
  };
}

function normalizeRecordPayload<TData extends BaseRecord>(payload: unknown): TData {
  if (typeof payload === 'object' && payload !== null) {
    const maybeWrapped = payload as { data?: unknown; item?: unknown };

    if (maybeWrapped.data && typeof maybeWrapped.data === 'object') {
      return maybeWrapped.data as TData;
    }

    if (maybeWrapped.item && typeof maybeWrapped.item === 'object') {
      return maybeWrapped.item as TData;
    }
  }

  return payload as TData;
}

function buildCustomQuery(query: unknown): string {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    return '';
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const dataProvider: DataProvider = {
  getApiUrl: () => adminEnv.apiUrl,

  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
    pagination,
    sorters,
    filters,
    meta,
  }: GetListParams) => {
    const endpoint = resolveEndpoint(resource, meta as MetaBag);
    const url = `${adminEnv.apiUrl}${endpoint}${buildListQuery({ pagination, sorters, filters })}`;
    const { body, response } = await authorizedFetch<unknown>(url);
    return normalizeListPayload<TData>(body, response);
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id, meta }: GetOneParams) => {
    const endpoint = resolveEndpoint(resource, meta as MetaBag);
    const url = `${adminEnv.apiUrl}${endpoint}/${id}`;
    const { body } = await authorizedFetch<unknown>(url);
    return {
      data: normalizeRecordPayload<TData>(body),
    };
  },

  getMany: async <TData extends BaseRecord = BaseRecord>({
    resource,
    ids,
    meta,
  }: GetManyParams) => {
    const endpoint = resolveEndpoint(resource, meta as MetaBag);
    const query = buildQuery({
      ids: ids.join(','),
    });
    const url = `${adminEnv.apiUrl}${endpoint}${query}`;
    const { body, response } = await authorizedFetch<unknown>(url);
    return {
      data: normalizeListPayload<TData>(body, response).data,
    };
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    variables,
    meta,
  }: CreateParams<TVariables>) => {
    const endpoint = resolveEndpoint(resource, meta as MetaBag);
    const url = `${adminEnv.apiUrl}${endpoint}`;
    const { body } = await authorizedFetch<unknown>(url, {
      method: 'POST',
      body: JSON.stringify(variables ?? {}),
    });

    return {
      data: normalizeRecordPayload<TData>(body),
    };
  },

  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    variables,
    meta,
  }: CreateManyParams<TVariables>) => {
    const created = await Promise.all(
      variables.map((variable) =>
        dataProvider.create<TData, TVariables>({
          resource,
          variables: variable,
          meta,
        })
      )
    );

    return {
      data: created.map((entry) => entry.data),
    };
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    id,
    variables,
    meta,
  }: UpdateParams<TVariables>) => {
    const endpoint = resolveEndpoint(resource, meta as MetaBag);
    const url = `${adminEnv.apiUrl}${endpoint}/${id}`;
    const { body } = await authorizedFetch<unknown>(url, {
      method: 'PATCH',
      body: JSON.stringify(variables ?? {}),
    });

    return {
      data: normalizeRecordPayload<TData>(body),
    };
  },

  updateMany: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    ids,
    variables,
    meta,
  }: UpdateManyParams<TVariables>) => {
    const updated = await Promise.all(
      ids.map((id) =>
        dataProvider.update<TData, TVariables>({
          resource,
          id,
          variables,
          meta,
        })
      )
    );

    return {
      data: updated.map((entry) => entry.data),
    };
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    id,
    variables,
    meta,
  }: DeleteOneParams<TVariables>) => {
    const endpoint = resolveEndpoint(resource, meta as MetaBag);
    const url = `${adminEnv.apiUrl}${endpoint}/${id}`;
    const { body } = await authorizedFetch<unknown>(url, {
      method: 'DELETE',
      body: variables ? JSON.stringify(variables) : undefined,
    });

    return {
      data: normalizeRecordPayload<TData>(body),
    };
  },

  deleteMany: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    ids,
    variables,
    meta,
  }: DeleteManyParams<TVariables>) => {
    const deleted = await Promise.all(
      ids.map((id) =>
        dataProvider.deleteOne<TData, TVariables>({
          resource,
          id,
          variables,
          meta,
        })
      )
    );

    return {
      data: deleted.map((entry) => entry.data),
    };
  },

  custom: async <TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ) => {
    const { url, method, filters, sorters, payload, query, headers } = params;
    const listQuery = buildListQuery({
      pagination: undefined,
      sorters,
      filters,
    });
    const customQuery = buildCustomQuery(query);
    const separator = listQuery && customQuery ? '&' : '';
    const customUrl = `${url}${listQuery}${customQuery.replace('?', separator || '?')}`;

    const { body } = await authorizedFetch<TData>(customUrl, {
      method: method ?? 'get',
      headers: headers as HeadersInit | undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    return {
      data: body,
    };
  },
};
