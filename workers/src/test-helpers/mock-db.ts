import { mock } from "node:test";

export interface MockStore {
  products: any[];
  product_source_images: any[];
  ai_generation_tasks: any[];
  task_queue: any[];
  product_generated_images: any[];
  user_profiles: any[];
  credit_transactions: any[];
  customer_models?: any[];
}

const queryTableMap = {
  products: "products",
  productSourceImages: "product_source_images",
  aiGenerationTasks: "ai_generation_tasks",
  taskQueue: "task_queue",
  productGeneratedImages: "product_generated_images",
  userProfiles: "user_profiles",
  creditTransactions: "credit_transactions",
  customerModels: "customer_models",
} as const;

function getTableName(table: any): keyof MockStore {
  const symbol = Object.getOwnPropertySymbols(table).find((entry) =>
    String(entry).includes("drizzle:BaseName")
  );

  if (!symbol) {
    throw new Error("Unable to resolve table name");
  }

  return table[symbol] as keyof MockStore;
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseComparisons(where: any): Array<{ column: string; value: any }> {
  const comparisons: Array<{ column: string; value: any }> = [];

  function visit(node: any) {
    const chunks = node?.queryChunks ?? [];
    if (chunks.length === 0) {
      return;
    }

    const column = chunks.find(
      (chunk: any) => chunk && typeof chunk === "object" && "name" in chunk
    );
    const param = chunks.find((chunk: any) => chunk?.constructor?.name === "Param");

    if (column && param) {
      comparisons.push({
        column: column.name,
        value: param.value,
      });
    }

    for (const chunk of chunks) {
      if (chunk?.queryChunks) {
        visit(chunk);
      }
    }
  }

  visit(where);
  return comparisons;
}

function findRows(store: MockStore, tableName: keyof MockStore, where?: any): any[] {
  const rows = store[tableName] ?? [];
  if (!where) {
    return rows;
  }

  const comparisons = parseComparisons(where);
  if (comparisons.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    comparisons.every(({ column, value }) => row[toCamelCase(column)] === value)
  );
}

function createQueryApi(store: MockStore) {
  return Object.fromEntries(
    Object.entries(queryTableMap).map(([queryName, tableName]) => [
      queryName,
      {
        findFirst: async ({ where }: { where?: any } = {}) =>
          findRows(store, tableName, where)[0] ?? null,
        findMany: async ({ where }: { where?: any } = {}) =>
          findRows(store, tableName, where).map((row) => structuredClone(row)),
      },
    ])
  );
}

export function patchDb(db: any, store: MockStore) {
  for (const [queryName, tableName] of Object.entries(queryTableMap)) {
    const query = db.query[queryName];
    if (!query) {
      continue;
    }

    if (typeof query.findFirst === "function") {
      mock.method(query, "findFirst", async ({ where }: { where?: any } = {}) => {
        return findRows(store, tableName, where)[0] ?? null;
      });
    }

    if (typeof query.findMany === "function") {
      mock.method(query, "findMany", async ({ where }: { where?: any } = {}) => {
        return findRows(store, tableName, where).map((row) => structuredClone(row));
      });
    }
  }

  mock.method(db, "update", (table: any) => {
    const tableName = getTableName(table);
    return {
      set(values: Record<string, unknown>) {
        return {
          async where(where: any) {
            const rows = findRows(store, tableName, where);
            for (const row of rows) {
              Object.assign(row, values);
            }
            return rows;
          },
        };
      },
    };
  });

  mock.method(db, "insert", (table: any) => {
    const tableName = getTableName(table);
    return {
      async values(values: Record<string, unknown> | Array<Record<string, unknown>>) {
        const rows = Array.isArray(values) ? values : [values];
        if (!store[tableName]) {
          store[tableName] = [];
        }
        store[tableName].push(...rows.map((row) => structuredClone(row)));
        return rows;
      },
    };
  });

  mock.method(db, "transaction", async (callback: (tx: any) => Promise<any>) => {
    const tx = {
      query: createQueryApi(store),
      update: (table: any) => {
        const tableName = getTableName(table);
        return {
          set(values: Record<string, unknown>) {
            return {
              async where(where: any) {
                const rows = findRows(store, tableName, where);
                for (const row of rows) {
                  Object.assign(row, values);
                }
                return rows;
              },
            };
          },
        };
      },
      insert: (table: any) => {
        const tableName = getTableName(table);
        return {
          async values(values: Record<string, unknown> | Array<Record<string, unknown>>) {
            const rows = Array.isArray(values) ? values : [values];
            if (!store[tableName]) {
              store[tableName] = [];
            }
            store[tableName].push(...rows.map((row) => structuredClone(row)));
            return rows;
          },
        };
      },
    };

    return callback(tx);
  });
}
