export default function FormActions({ children }: FormActionsProps) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-10 mt-auto flex items-center justify-between bg-white p-4 drop-shadow-2xl lg:static lg:inset-auto lg:z-0 lg:bg-transparent lg:p-0 lg:drop-shadow-none">
        {children}
      </div>
    );
  }
  
  interface FormActionsProps {
    children: React.ReactNode;
  }