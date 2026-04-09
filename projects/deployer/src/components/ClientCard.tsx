import type { Client } from '../types';

interface Props {
  client: Client;
  onClick?: () => void;
}

export default function ClientCard({ client, onClick }: Props) {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{client.name}</p>
          <p className="text-sm text-muted-foreground">{client.slug}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {client.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {client.contactEmail && (
        <p className="text-sm text-muted-foreground mt-2">{client.contactEmail}</p>
      )}
    </div>
  );
}
