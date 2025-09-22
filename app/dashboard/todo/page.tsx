
import React from "react";

import CreateForm from "./components/CreateForm";
import TodoTable from "./components/TodoTable";

export default function Todo() {
  return (
    <div className="flex h-full min-h-screen items-start justify-center py-10">
      <div className="w-full max-w-4xl space-y-6 px-4">
        <CreateForm />
        <TodoTable />
      </div>
    </div>
  );
}
