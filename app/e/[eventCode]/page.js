import GuestRequestForm from '../../../components/GuestRequestForm';
import { getEvent } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export default function GuestPage({ params }) {
  const event = getEvent();

  return (
    <GuestRequestForm
      eventCode={params.eventCode}
      eventName={event.name}
      isActive={event.isActive}
    />
  );
}
