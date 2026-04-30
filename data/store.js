let event = {
  id: "1",
  name: "Birthday Bash @ Club Room",
  code: "TANZ",
  isActive: true,
};

let requests = [
  { id: "1", guest_name: "Lea", song_title: "One More Time", artist: "Daft Punk", status: "open", created_at: "22:14" },
  { id: "2", guest_name: "Timo", song_title: "Titanium", artist: "David Guetta feat. Sia", status: "accepted", created_at: "22:16" },
  { id: "3", guest_name: "Nina", song_title: "Mr. Brightside", artist: "The Killers", status: "played", created_at: "22:05" },
  { id: "4", guest_name: "Mara", song_title: "Levels", artist: "Avicii", status: "open", created_at: "22:20" },
];

export function getEvent() {
  return event;
}

export function getRequests() {
  return requests;
}

export function addRequest({ guest_name, song_title, artist }) {
  const now = new Date();
  const created_at = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const item = {
    id: String(Date.now()),
    guest_name,
    song_title,
    artist,
    status: "open",
    created_at,
  };
  requests = [item, ...requests];
  return item;
}

export function updateRequestStatus(id, status) {
  requests = requests.map((r) => (r.id === String(id) ? { ...r, status } : r));
  return requests;
}

export function updateEvent(patch) {
  event = { ...event, ...patch };
  return event;
}


export function deleteRequest(id) {
  requests = requests.filter((r) => r.id !== String(id));
  return requests;
}
