import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

/**
 * Side panel that shows all media (images, videos, generic files) shared within
 * the currently-selected group chat. Designed to be rendered at the root level
 * of ChatContainer so it can make use of the same <img> preview handler there.
 *
 * Props
 * -----
 * isOpen: boolean – Whether the drawer is visible.
 * onClose: () => void – Callback to close the drawer.
 * mediaItems: Array<{ url: string, type: string, senderName: string, _id: string }> –
 *   Flattened list of media objects extracted from chat messages.
 * onImageClick: (url: string) => void – Handler when an image thumbnail is clicked.
 */
const GroupMediaGalleryPanel = ({ isOpen, onClose, mediaItems, onImageClick }) => {
  return (
    <div>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl ring-1 ring-black/10 z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">Shared Media</h2>
          <button
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
            onClick={onClose}
            aria-label="Close media gallery"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mediaItems.length === 0 ? (
            <div className="text-gray-400 text-center mt-10">No media shared yet</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {mediaItems.map((item) => (
                <div key={item._id} className="relative group">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt="media"
                      onClick={() => onImageClick(item.url)}
                      className="object-cover w-full h-28 rounded-lg cursor-pointer shadow group-hover:opacity-90 transition"
                    />
                  ) : item.type === 'video' ? (
                    <video
                      src={item.url}
                      controls={false}
                      className="object-cover w-full h-28 rounded-lg shadow"
                    />
                  ) : (
                    <a
                      href={item.url}
                      className="flex items-center justify-center w-full h-28 bg-gray-100 rounded-lg text-sm text-blue-600 underline shadow"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      File
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

GroupMediaGalleryPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mediaItems: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      senderName: PropTypes.string,
      _id: PropTypes.string,
    })
  ).isRequired,
  onImageClick: PropTypes.func.isRequired,
};

export default GroupMediaGalleryPanel; 