import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-4">
        <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">Welcome to Your Mobile Cover Customizer</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Design your unique mobile cover here!
        </p>
        <Link to="/customize-cover">
          <Button size="lg" className="px-8 py-4 text-lg">Start Customizing</Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;