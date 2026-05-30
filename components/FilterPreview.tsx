import type { Email } from "@/types/email";

type FilterPreviewProps = {
  totalMatches: number;
  emails: Email[];
};

export function FilterPreview({ totalMatches, emails }: FilterPreviewProps) {
  return (
    <div className="mt-6 rounded-lg border bg-white">
      <div className="border-b px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Found {totalMatches.toLocaleString()} emails
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {emails.length > 0 ? (
            <>
              Previewing {emails.length} of {totalMatches.toLocaleString()}.
              <br />
              Actions apply only to these previewed emails.
            </>
          ) : (
            "No results found."
          )}
        </p>
      </div>

      {emails.length === 0 ? (
        <div className="px-6 py-8 text-sm text-gray-500">
          No results found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  From
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {email.sender || "Unknown sender"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {email.subject || "(No Subject)"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {email.date || "Unknown date"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
