import DashboardClient from '../../components/DashboardClient';
import { getEvent, getRequests } from '../../lib/store';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <DashboardClient initialRequests={getRequests()} initialEvent={getEvent()} />;
}
