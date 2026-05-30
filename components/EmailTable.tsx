import type { Email } from "@/types/email";

type EmailTableProps = {
  emails: Email[];
};

export function EmailTable({ emails }: EmailTableProps) {
  if (emails.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
        No emails found in your inbox.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              From
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Subject
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Date
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-gray-50">
              <td className="max-w-xs px-4 py-3 text-sm text-gray-900">
                {email.sender}
              </td>
              <td className="max-w-md px-4 py-3 text-sm text-gray-900">
                {email.subject}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {email.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
