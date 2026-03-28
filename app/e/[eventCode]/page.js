import GuestRequestForm from '../../../components/GuestRequestForm';
import { getEvent } from '../../../data/store';

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
