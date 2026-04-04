import Downbar from "../../Components/Downbar";
import Navbar from "../../Components/Navbar";

export default function Profile() {
  return (

    <>
    <Navbar />
    <div className="flex-1 p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <p>Welcome to the admin panel Profile</p>
    </div>
    <Downbar />
    </>
  );
}