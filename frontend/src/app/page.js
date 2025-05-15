import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to Our Service</h1>
      <p className="text-lg mb-8">This is the frontend for your microservice application.</p>
      <div className="flex space-x-4">
        <Link 
          href="/login"
          className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
        >
          Login
        </Link>
        <Link 
          href="/items"
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded hover:bg-gray-300"
        >
          View Items
        </Link>
      </div>
    </div>
  );
}
