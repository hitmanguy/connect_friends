export const CharLimitInfo = ({
  value,
  limit,
}: {
  value: string;
  limit: number;
}) => {
  const count = (value ?? "").length;
  const reached = count >= limit;
  return (
    <div
      className="mt-1 flex justify-between items-center text-xs"
      aria-live="polite"
    >
      <span className={reached ? "text-red-600" : "sr-only"}>
        Character limit reached; you can’t write more.
      </span>
      <span className={reached ? "text-red-600 font-medium" : "text-blue-600"}>
        {count}/{limit}
      </span>
    </div>
  );
};
