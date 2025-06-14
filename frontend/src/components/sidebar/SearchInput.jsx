import { Search } from "lucide-react";

const SearchInput = ({ value, onChange }) => {
  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
        <Search />
      </span>
      <input
        type="text"
        placeholder="Search users or groups..."
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 hover:border-blue-300"
      />
    </div>
  );
};

export default SearchInput;
