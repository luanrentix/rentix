// Actions mapped to the existing backend operations.
export const moduleActions: Record<string, string[]> = {
  schedule: ["create", "view", "edit", "delete"],
  bank: ["create", "view", "edit", "delete", "special", "export", "print"],
  accountsPayable: ["create", "view", "edit", "delete", "special", "print"],
  accountsReceivable: [
    "create",
    "view",
    "edit",
    "delete",
    "special",
    "export",
    "print",
  ],
  contracts: ["create", "view", "edit", "delete", "special", "export", "print"],
  dashboard: ["view"],
  financial: ["view"],
  properties: ["create", "view", "edit", "delete"],
  people: ["create", "view", "edit", "delete"],
  settings: ["view", "edit"],
  sales: ["create", "view", "special", "edit", "delete", "print", "export"],
};
export const actionLabels: Record<string, string> = {
  view: "Visualizar",
  create: "Cadastrar",
  edit: "Editar",
  delete: "Excluir / cancelar / estornar",
  print: "Imprimir",
  export: "Exportar / compartilhar",
  special: "Operações especiais",
};
