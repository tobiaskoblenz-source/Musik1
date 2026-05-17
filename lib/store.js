import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'data', 'data.json');

const defaultData = {
  event: { id: '1', name: 'TANZ', code: 'TANZ', isActive: true, closedMessage: 'Wünsche sind kurz pausiert. Der DJ ist gleich wieder bereit.', showGuestQueue: true, showNowPlaying: true },
  requests: [
    { id: '1', guest_name: 'Lea', song_title: 'One More Time', artist: 'Daft Punk', status: 'open', created_at: '22:14', order_index: 0 },
    { id: '2', guest_name: 'Timo', song_title: 'Titanium', artist: 'David Guetta feat. Sia', status: 'accepted', created_at: '22:16', order_index: 1 },
    { id: '3', guest_name: 'Nina', song_title: 'Mr. Brightside', artist: 'The Killers', status: 'played', created_at: '22:05', order_index: 2 },
    { id: '4', guest_name: 'Mara', song_title: 'Levels', artist: 'Avicii', status: 'open', created_at: '22:20', order_index: 3 }
  ]
};

function ensureDataFile() {
  const dir = path.dirname(dataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf8');
}

export function readData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf8');
    return defaultData;
  }
}

export function writeData(nextData) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(nextData, null, 2), 'utf8');
  return nextData;
}

export function getEvent() { return readData().event; }
export function getRequests() { return readData().requests; }

export function addRequest({ guest_name, song_title, artist, spotify_track_id, spotify_track_uri, spotify_url, spotify_image, spotify_album }) {
  const data = readData();
  const now = new Date();
  const created_at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const item = {
    id: String(Date.now()),
    guest_name,
    song_title,
    artist,
    status: 'open',
    created_at,
    order_index: 0,
    spotify_track_id: spotify_track_id || '',
    spotify_track_uri: spotify_track_uri || '',
    spotify_url: spotify_url || '',
    spotify_image: spotify_image || '',
    spotify_album: spotify_album || ''
  };
  data.requests = [item, ...data.requests.map((r, index) => ({ ...r, order_index: Number(r.order_index ?? index) + 1 }))];
  writeData(data);
  return item;
}

export function updateRequestStatus(id, status) {
  const data = readData();
  data.requests = data.requests.map((r) => (r.id === String(id) ? { ...r, status } : r));
  writeData(data);
  return data.requests;
}


export function updateRequestOrder(orderIds = []) {
  const data = readData();
  const orderMap = new Map(orderIds.map((id, index) => [String(id), index]));
  data.requests = data.requests.map((r, index) => ({
    ...r,
    order_index: orderMap.has(String(r.id)) ? orderMap.get(String(r.id)) : Number(r.order_index ?? index)
  }));
  writeData(data);
  return data.requests;
}

export function deleteRequest(id) {
  const data = readData();
  data.requests = data.requests.filter((r) => r.id !== String(id));
  writeData(data);
  return data.requests;
}

export function updateEvent(patch) {
  const data = readData();
  data.event = { ...data.event, ...patch };
  writeData(data);
  return data.event;
}
