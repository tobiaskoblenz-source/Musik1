import DashboardClient from '../../components/DashboardClient';
import { getEvent, getRequests } from '../../data/store';

export default function DashboardPage() {
  return <DashboardClient initialRequests={getRequests()} initialEvent={getEvent()} />;
}
