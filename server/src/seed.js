// Seed script: creates demo Auth users (incl. an admin) and 35 fictional
// listings in Firestore. ALL data here is fictional, written for demo
// purposes — no real personal data.
//
// Works against a real Firebase project (with Admin SDK credentials in the
// environment) or the Firebase Emulator Suite (set FIREBASE_AUTH_EMULATOR_HOST
// and FIRESTORE_EMULATOR_HOST). Run: npm run seed
//
// Idempotent: existing Auth users (looked up by email), user docs and seeded
// listings (looked up by their seed_index marker) are skipped on re-run.
const path = require('path');
// Load the repo-root .env so a single file serves server + client
// (dotenv's default would only look in the current working directory).
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const { admin, db } = require('./firebase');
const store = require('./store');

const OWNERS = [
  ['Aarav Mehta', 'aarav.mehta@example.com', 'Marketing executive'],
  ['Priya Sharma', 'priya.sharma@example.com', 'Software engineer'],
  ['Rohan Iyer', 'rohan.iyer@example.com', 'Designer'],
  ['Sneha Kulkarni', 'sneha.kulkarni@example.com', 'Teacher'],
  ['Vikram Reddy', 'vikram.reddy@example.com', 'Sales manager'],
  ['Ananya Das', 'ananya.das@example.com', 'Doctor'],
  ['Karan Malhotra', 'karan.malhotra@example.com', 'Startup founder'],
  ['Divya Nair', 'divya.nair@example.com', 'Architect'],
];

// [title, description, city, area, rent, deposit, bhk, room_type, furnishing, tenant_preference, amenities[], dLat, dLng]
const L = [
  // ---------------- MUMBAI (19.0760, 72.8777)
  ['Sunny 1BHK near Azad Nagar metro', 'Bright 1BHK on the 4th floor with a small balcony. 5 min walk to Azad Nagar metro, markets and eateries nearby. Ideal for a working couple or single professional.', 'Mumbai', 'Andheri West', 28000, 84000, '1BHK', 'entire_place', 'semi_furnished', 'any', ['Wi-Fi', 'Power backup', 'Balcony', 'CCTV'], 0.012, 0.008],
  ['Private room in 3BHK, Hiranandani', 'Furnished private room with attached bath in a 3BHK shared with two IT professionals. Gated township with clubhouse, 10 min to Powai plaza.', 'Mumbai', 'Powai', 18500, 55500, '3BHK', 'private_room', 'furnished', 'any', ['Wi-Fi', 'Housekeeping', 'Gym', 'Swimming pool', 'Parking'], -0.006, 0.015],
  ['Shared room for working women, Kala Nagar', 'Twin-sharing room in a women-only 2BHK. Bunk beds with storage, attached washroom. Quiet building, 15 min to BKC by auto.', 'Mumbai', 'Bandra East', 14000, 28000, '2BHK', 'shared_room', 'furnished', 'female', ['Wi-Fi', 'Washing machine', 'Fridge', 'CCTV'], 0.02, -0.01],
  ['1RK with balcony near station', 'Compact 1RK, unfurnished, on the 2nd floor. 7 min walk to Thane station west side. Good for a bachelor on a budget.', 'Mumbai', 'Thane West', 11000, 33000, '1RK', 'entire_place', 'unfurnished', 'any', ['Power backup', 'Balcony'], -0.015, 0.006],
  ['2BHK family flat, Evershine Nagar', 'Semi-furnished 2BHK in a family-oriented society. Park-facing, with modular kitchen and two balconies. Schools and D-mart within 1 km.', 'Mumbai', 'Malad West', 32000, 96000, '2BHK', 'entire_place', 'semi_furnished', 'family', ['Parking', 'Balcony', 'Modular kitchen', 'CCTV', 'Power backup'], 0.008, -0.014],
  ['Private room in 2BHK, Film City road', 'Furnished room with dedicated workspace in a 2BHK shared with one media professional. 10 min to Dindoshi metro.', 'Mumbai', 'Goregaon East', 15500, 46500, '2BHK', 'private_room', 'furnished', 'any', ['Wi-Fi', 'Housekeeping', 'Fridge', 'TV'], -0.01, 0.011],
  ['1BHK gated society, Sector 12', 'Furnished 1BHK in a gated Kharghar society with clubhouse and pool. 10 min to Kharghar station, 20 min to Belapur CBD.', 'Mumbai', 'Kharghar, Navi Mumbai', 16000, 48000, '1BHK', 'entire_place', 'furnished', 'any', ['Gym', 'Swimming pool', 'Parking', 'Power backup', 'CCTV'], 0.014, -0.007],

  // ---------------- HYDERABAD (17.3850, 78.4867)
  ['Furnished 1BHK, walk to Financial District', 'Fully furnished 1BHK with queen bed, sofa and equipped kitchen. 12 min walk to Financial District offices. Immediate move-in.', 'Hyderabad', 'Gachibowli', 16000, 32000, '1BHK', 'entire_place', 'furnished', 'any', ['Wi-Fi', 'Washing machine', 'Fridge', 'TV', 'Power backup'], 0.009, 0.012],
  ['Private room in 3BHK villa', 'Spacious private room with attached bath in an independent villa shared with two working professionals. Quiet lane, 10 min to Kondapur signal.', 'Hyderabad', 'Kondapur', 9500, 19000, '3BHK', 'private_room', 'semi_furnished', 'male', ['Wi-Fi', 'Parking', 'Balcony', 'Power backup'], -0.011, 0.007],
  ['Shared room near Cyber Towers', 'Twin-sharing room 5 min from Cyber Towers. Beds with storage, common kitchen. Ideal for freshers joining Hitech City offices.', 'Hyderabad', 'Hitech City', 8000, 16000, '2BHK', 'shared_room', 'furnished', 'any', ['Wi-Fi', 'Housekeeping', 'Fridge'], 0.006, -0.009],
  ['1RK for bachelors, near metro', 'Simple 1RK with attached kitchen and bath, 6 min walk to Miyapur metro. Water 24x7, independent entry.', 'Hyderabad', 'Miyapur', 8500, 17000, '1RK', 'entire_place', 'unfurnished', 'male', ['Power backup', 'Parking'], -0.013, -0.005],
  ['2BHK semi-furnished, Botanical Garden road', 'Airy 2BHK on the 3rd floor overlooking the botanical gardens. Semi-furnished with wardrobes and modular kitchen. Family preferred.', 'Hyderabad', 'Kothaguda', 22000, 44000, '2BHK', 'entire_place', 'semi_furnished', 'family', ['Balcony', 'Modular kitchen', 'Parking', 'CCTV', 'Power backup'], 0.011, -0.012],
  ['Private room in family flat', 'One private room with shared kitchen in a family-occupied 3BHK. Homely food option available. 10 min to Begumpet metro.', 'Hyderabad', 'Begumpet', 10000, 20000, '3BHK', 'private_room', 'furnished', 'female', ['Wi-Fi', 'Fridge', 'TV'], -0.007, 0.01],
  ['1BHK, Tarnaka, near university', 'Well-kept 1BHK in a quiet Tarnaka lane, popular with research scholars. 8 min to the metro, daily needs within walking distance.', 'Hyderabad', 'Tarnaka, Secunderabad', 13500, 27000, '1BHK', 'entire_place', 'semi_furnished', 'any', ['Wi-Fi', 'Balcony', 'Power backup'], 0.015, 0.004],

  // ---------------- BANGALORE (12.9716, 77.5946)
  ['Private room in 3BHK, 5th Block', 'Furnished private room with balcony in a 3BHK shared with two product folks. 5th Block market at walking distance.', 'Bangalore', 'Koramangala', 14000, 70000, '3BHK', 'private_room', 'furnished', 'any', ['Wi-Fi', 'Housekeeping', 'Fridge', 'Balcony'], 0.008, 0.01],
  ['1BHK, Sector 2, park-facing', 'Park-facing 1BHK on the 2nd floor with good ventilation. Semi-furnished, 10 min to Agara lake jogging track.', 'Bangalore', 'HSR Layout', 20000, 100000, '1BHK', 'entire_place', 'semi_furnished', 'any', ['Balcony', 'Parking', 'Power backup', 'CCTV'], -0.009, 0.006],
  ['Shared room near ITPL', 'Twin-sharing room in a 3BHK 10 min from ITPL main gate. Company bus stop 200 m away. Cook available in the flat.', 'Bangalore', 'Whitefield', 9000, 45000, '3BHK', 'shared_room', 'furnished', 'male', ['Wi-Fi', 'Washing machine', 'Fridge'], 0.012, -0.008],
  ['Furnished studio, 100 Ft Road', 'Compact furnished studio with kitchenette on 100 Ft Road. Walk to pubs and cafes, 15 min to MG Road metro.', 'Bangalore', 'Indiranagar', 24000, 120000, '1RK', 'entire_place', 'furnished', 'any', ['Wi-Fi', 'TV', 'Fridge', 'Power backup'], -0.006, -0.011],
  ['1RK near tech park', 'Basic 1RK for a single occupant, 10 min walk to the Electronic City tech park gates. Independent house, no restrictions.', 'Bangalore', 'Electronic City', 9500, 47500, '1RK', 'entire_place', 'unfurnished', 'any', ['Parking', 'Power backup'], 0.01, 0.013],
  ['Private room in 2BHK', 'Private room with attached bath in a 2BHK shared with one designer. 8 min to Marathahalli bridge, bus stop nearby.', 'Bangalore', 'Marathahalli', 11500, 57500, '2BHK', 'private_room', 'furnished', 'any', ['Wi-Fi', 'Housekeeping', 'Balcony'], -0.012, -0.006],
  ['2BHK for family, 2nd Stage', 'Sunlit 2BHK in a residential BTM 2nd Stage lane. East-facing, with utility area and covered car parking. Families preferred.', 'Bangalore', 'BTM Layout', 26000, 130000, '2BHK', 'entire_place', 'semi_furnished', 'family', ['Parking', 'Balcony', 'Modular kitchen', 'CCTV'], 0.007, 0.009],

  // ---------------- PUNE (18.5204, 73.8567)
  ['Private room in 3BHK, Phase 1', 'Furnished private room in a 3BHK 5 min from Hinjewadi Phase 1. Shared with two engineers, maid and cook in place.', 'Pune', 'Hinjewadi', 9000, 27000, '3BHK', 'private_room', 'furnished', 'any', ['Wi-Fi', 'Housekeeping', 'Fridge', 'Washing machine'], 0.01, 0.008],
  ['1BHK, main road, furnished', 'Fully furnished 1BHK on Baner main road with lift and covered parking. 15 min to Balewadi stadium.', 'Pune', 'Baner', 17000, 51000, '1BHK', 'entire_place', 'furnished', 'any', ['Wi-Fi', 'TV', 'Fridge', 'Parking', 'Power backup'], -0.008, 0.011],
  ['Shared room near Phoenix mall', 'Twin-sharing room in a 2BHK 10 min walk from the mall and Wakad bridge. Good for students and young professionals.', 'Pune', 'Wakad', 7500, 22500, '2BHK', 'shared_room', 'semi_furnished', 'any', ['Wi-Fi', 'Fridge'], 0.006, -0.009],
  ['Studio with terrace', 'Charming studio with a private terrace sit-out in a Koregaon Park lane. Furnished, independent entry, pet-friendly.', 'Pune', 'Koregaon Park', 22000, 66000, '1RK', 'entire_place', 'furnished', 'any', ['Wi-Fi', 'Balcony', 'TV', 'Fridge'], -0.011, -0.007],
  ['1RK near Symbiosis', 'Compact 1RK popular with students, 8 min walk to campus. Attached bath and kitchenette, 24x7 water.', 'Pune', 'Viman Nagar', 11500, 34500, '1RK', 'entire_place', 'semi_furnished', 'any', ['Wi-Fi', 'Power backup'], 0.013, 0.005],
  ['2BHK, EON IT park road', 'Semi-furnished 2BHK in a Kharadi society 10 min from EON IT park. Clubhouse, pool and grocery store inside the campus.', 'Pune', 'Kharadi', 24000, 72000, '2BHK', 'entire_place', 'semi_furnished', 'family', ['Gym', 'Swimming pool', 'Parking', 'Power backup', 'CCTV'], -0.007, 0.012],
  ['Private room in Magarpatta-adjacent society', 'Private room with shared kitchen in a 2BHK next to Magarpatta city. Green campus, 10 min to Hadapsar industrial area.', 'Pune', 'Hadapsar', 10500, 31500, '2BHK', 'private_room', 'furnished', 'female', ['Wi-Fi', 'Housekeeping', 'Balcony'], 0.009, -0.01],

  // ---------------- DELHI NCR (28.6139, 77.2090)
  ['Private room in 3BHK, near HUDA metro', 'Furnished private room with attached bath, 7 min walk to HUDA City Centre metro. Shared with two consultants.', 'Delhi NCR', 'Gurgaon Sector 29', 13000, 26000, '3BHK', 'private_room', 'furnished', 'any', ['Wi-Fi', 'Housekeeping', 'Fridge', 'Power backup'], -0.35, -0.28],
  ['1BHK furnished, near Fortis', 'Fully furnished 1BHK with AC in both rooms, 10 min to Fortis hospital and Sector 18 market. Gated block.', 'Delhi NCR', 'Noida Sector 62', 15000, 30000, '1BHK', 'entire_place', 'furnished', 'any', ['Wi-Fi', 'TV', 'Fridge', 'Parking', 'Power backup'], 0.28, 0.35],
  ['Shared room, J-Block', 'Twin-sharing room in a builder-floor 2BHK in Saket J-Block. 12 min to Saket metro, market 5 min away.', 'Delhi NCR', 'Saket, Delhi', 11000, 22000, '2BHK', 'shared_room', 'semi_furnished', 'female', ['Wi-Fi', 'Washing machine', 'Fridge'], -0.15, -0.1],
  ['2BHK, Sector 6, near metro', 'Well-maintained 2BHK on the 3rd floor (with lift), 5 min to Dwarka Sector 6 metro. Park-facing balcony.', 'Delhi NCR', 'Dwarka, Delhi', 21000, 42000, '2BHK', 'entire_place', 'semi_furnished', 'family', ['Parking', 'Balcony', 'Modular kitchen', 'Power backup'], -0.22, -0.3],
  ['1RK, Sector 7', 'Simple 1RK on the ground floor of an independent house. 10 min to Rohini West metro. Suits a single working person.', 'Delhi NCR', 'Rohini, Delhi', 8000, 16000, '1RK', 'entire_place', 'unfurnished', 'any', ['Parking'], 0.12, -0.18],
  ['Private room in 2BHK, Ahinsa Khand', 'Private room with attached bath in a 2BHK, Ahinsa Khand 2. 10 min to Noida Electronic City metro via auto.', 'Delhi NCR', 'Indirapuram, Ghaziabad', 9500, 19000, '2BHK', 'private_room', 'furnished', 'male', ['Wi-Fi', 'Fridge', 'Balcony'], 0.32, 0.28],
  ['1BHK, Sector 15', '1BHK with modular kitchen in a quiet Sector 15 pocket. 12 min to Bata Chowk metro, market across the road.', 'Delhi NCR', 'Faridabad Sector 15', 10500, 21000, '1BHK', 'entire_place', 'semi_furnished', 'any', ['Parking', 'Modular kitchen', 'Power backup'], -0.05, -0.42],
];

const CITY_CENTRES = {
  Mumbai: [19.076, 72.8777],
  Hyderabad: [17.385, 78.4867],
  Bangalore: [12.9716, 77.5946],
  Pune: [18.5204, 73.8567],
  'Delhi NCR': [28.6139, 77.209],
};

async function ensureAuthUser(email, password, displayName) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    console.log(`  Auth user exists: ${email} — skipping`);
    return existing;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  const created = await admin.auth().createUser({ email, password, displayName });
  console.log(`  Auth user created: ${email}`);
  return created;
}

async function ensureUserDoc(uid, data) {
  const ref = db.collection('users').doc(uid);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`  users/${uid} exists — skipping`);
    return;
  }
  await ref.set({ ...data, created_at: new Date().toISOString() });
  console.log(`  users/${uid} created`);
}

async function seed() {
  console.log('Seeding Roomie demo data (all fictional)...');

  // --- demo Auth users -----------------------------------------------------
  const adminUser = await ensureAuthUser('admin@roomie.demo', 'Roomie@123', 'Roomie Admin');
  await admin.auth().setCustomUserClaims(adminUser.uid, { admin: true });
  await ensureUserDoc(adminUser.uid, {
    name: 'Roomie Admin', email: 'admin@roomie.demo', role: 'admin',
    occupation: 'Community moderator', bio: 'Demo admin account for Roomie.',
  });

  const demoUser = await ensureAuthUser('demo@roomie.demo', 'demo1234', 'Demo User');
  await ensureUserDoc(demoUser.uid, {
    name: 'Demo User', email: 'demo@roomie.demo', role: 'user', phone: '+91 98000 00000',
    gender: 'any', occupation: 'Product designer', bio: 'Demo account — flat-hunting in Hyderabad.',
  });

  // --- fictional listing owners: Firestore user docs only (no Auth users) --
  const ownerUids = [];
  for (let i = 0; i < OWNERS.length; i++) {
    const [name, email, occupation] = OWNERS[i];
    const uid = `seed-owner-${i}`;
    await ensureUserDoc(uid, { name, email, role: 'user', occupation });
    ownerUids.push(uid);
  }

  // --- listings (idempotent via the seed_index marker) ----------------------
  let created = 0;
  for (let i = 0; i < L.length; i++) {
    const [title, desc, city, area, rent, deposit, bhk, roomType, furnishing, tenantPref, amenities, dLat, dLng] = L[i];
    const already = await db.collection('listings').where('seed_index', '==', i).limit(1).get();
    if (!already.empty) continue;
    const [cLat, cLng] = CITY_CENTRES[city];
    const daysAgo = (i * 37) % 28;
    await db.collection('listings').add({
      user_id: ownerUids[i % ownerUids.length],
      title,
      description: desc,
      city,
      area,
      address: null,
      lat: +(cLat + dLat).toFixed(3),
      lng: +(cLng + dLng).toFixed(3),
      rent,
      deposit,
      bhk,
      room_type: roomType,
      furnishing,
      tenant_preference: tenantPref,
      available_from: new Date(Date.now() + ((i * 13) % 20) * 86400000).toISOString().slice(0, 10),
      images: [
        `https://picsum.photos/seed/roomie-${i}-a/800/600`,
        `https://picsum.photos/seed/roomie-${i}-b/800/600`,
      ],
      amenities,
      status: 'active',
      seed: true,
      seed_index: i,
      created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
    created++;
  }
  console.log(`Listings: ${created} created, ${L.length - created} already seeded.`);

  console.log('Done.');
  console.log('  Admin: admin@roomie.demo / Roomie@123  (DEMO ONLY — change or delete before any real use)');
  console.log('  Demo user: demo@roomie.demo / demo1234');
}

seed().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
