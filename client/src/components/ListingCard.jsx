import { Link } from 'react-router-dom';
import { inr, ROOM_TYPE_LABELS, FURNISHING_LABELS } from '../format';

export default function ListingCard({ listing, onToggleSave }) {
  const img = listing.images && listing.images[0];
  return (
    <div className="card">
      <Link to={`/listing/${listing.id}`}>
        {img
          ? <img className="card-img" src={img} alt={listing.title} loading="lazy" />
          : <div className="card-img" />}
      </Link>
      <button
        className="save-btn"
        title={listing.is_saved ? 'Remove from saved' : 'Save this home'}
        onClick={(e) => { e.preventDefault(); onToggleSave && onToggleSave(listing); }}
      >
        {listing.is_saved ? '❤️' : '🤍'}
      </button>
      <div className="card-body">
        <Link to={`/listing/${listing.id}`}>
          <div className="card-price">{inr(listing.rent)}<small>/month</small></div>
          <div className="card-title">{listing.title}</div>
          <div className="card-meta">{listing.area}, {listing.city}</div>
          <div className="card-tags">
            {listing.bhk && <span className="tag grey">{listing.bhk}</span>}
            <span className="tag grey">{ROOM_TYPE_LABELS[listing.room_type]}</span>
            <span className="tag grey">{FURNISHING_LABELS[listing.furnishing]}</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
