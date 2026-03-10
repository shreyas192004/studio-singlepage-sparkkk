import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

const BackButton = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/");
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleBack}
            className="group mb-6 flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 font-bold uppercase transition-all hover:bg-black hover:text-white"
        >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back
        </Button>
    );
};

export default BackButton;
