import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { Trash2, Camera, Upload, Calendar, Clock, Edit, Award, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  userId: number;
  username: string;
  lastPracticeDate: string | null;
  recordingsCount: number;
  goal: string;
  goalDueDate: string | null;
  galleryImages: string[];
  profileImageUrl: string | null;
}

export default function UserProfileCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goal, setGoal] = useState("");
  const [goalDueDate, setGoalDueDate] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<string | null>(null);

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  // Update goal
  const updateGoalMutation = useMutation({
    mutationFn: async ({ goal, goalDueDate }: { goal: string; goalDueDate?: string }) => {
      const res = await apiRequest("POST", "/api/goal", { goal, goalDueDate });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setEditingGoal(false);
      toast({
        title: "Goal updated",
        description: "Your training goal has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add image to gallery
  const addImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest("POST", "/api/gallery", { imageUrl });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setUploadingImage(false);
      setImageToUpload(null);
      toast({
        title: "Image added",
        description: "New image has been added to your gallery.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove image from gallery
  const removeImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest("DELETE", "/api/gallery", { imageUrl });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Image removed",
        description: "The image has been removed from your gallery.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set initial goal state when profile loads
  useEffect(() => {
    if (profile) {
      setGoal(profile.goal || "");
      setGoalDueDate(profile.goalDueDate || "");
    }
  }, [profile]);

  const handleSaveGoal = () => {
    updateGoalMutation.mutate({ 
      goal, 
      goalDueDate: goalDueDate || undefined 
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setImageToUpload(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddImage = () => {
    if (imageToUpload) {
      addImageMutation.mutate(imageToUpload);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return isValid(date) ? format(date, "PPP") : "Invalid date";
  };

  const getLastPracticeText = (dateString: string | null) => {
    if (!dateString) return "No practice sessions yet";
    const date = new Date(dateString);
    if (!isValid(date)) return "Invalid date";
    return `Last practice: ${formatDistanceToNow(date, { addSuffix: true })}`;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold animate-pulse bg-secondary h-8 rounded"></CardTitle>
          <CardDescription className="animate-pulse bg-secondary h-4 w-3/4 rounded"></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-secondary h-48 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Profile not available</CardTitle>
          <CardDescription>There was an error loading your profile information.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-background border border-red-900/30">
      <CardHeader className="bg-gradient-to-r from-black to-red-950 text-white">
        <CardTitle className="text-2xl font-bold flex items-center justify-between">
          <span>Welcome, {profile.username}</span>
          <span className="text-sm font-normal flex items-center gap-2">
            <Clock size={16} />
            {getLastPracticeText(profile.lastPracticeDate)}
          </span>
        </CardTitle>
        <CardDescription className="text-gray-300">
          You have completed {profile.recordingsCount} training sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 grid gap-6">
        {/* Training Goals Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Award className="h-5 w-5 text-red-500" />
              Training Goal
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setEditingGoal(!editingGoal)}
              className="h-8 px-2 text-primary"
            >
              <Edit size={16} className="mr-1" /> 
              {editingGoal ? "Cancel" : "Edit"}
            </Button>
          </div>
          
          {editingGoal ? (
            <div className="space-y-3 mt-2">
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What's your next taekwondo goal?"
                className="min-h-[80px]"
              />
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">Target date (optional):</label>
                  <Input
                    type="date"
                    value={goalDueDate ? goalDueDate.substring(0, 10) : ""}
                    onChange={(e) => setGoalDueDate(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSaveGoal} 
                  disabled={!goal || updateGoalMutation.isPending}
                  className="mt-5"
                >
                  {updateGoalMutation.isPending ? "Saving..." : "Save Goal"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-md p-3 bg-secondary/20">
              <p className="mb-2">{profile.goal || "No goal set yet. Click Edit to add one!"}</p>
              {profile.goalDueDate && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar size={14} /> 
                  Target date: {formatDate(profile.goalDueDate)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Photo Gallery Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Image className="h-5 w-5 text-red-500" />
              My Gallery
            </h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Upload size={16} className="mr-1" /> Add Photo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Photo to Gallery</DialogTitle>
                  <DialogDescription>
                    Upload a photo from your practice or competition.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  {imageToUpload ? (
                    <div className="relative">
                      <img 
                        src={imageToUpload} 
                        alt="Preview" 
                        className="w-full h-auto max-h-80 object-contain rounded-md" 
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => setImageToUpload(null)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed p-8 rounded-md">
                      <Camera size={40} className="text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to select an image</p>
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button 
                    onClick={handleAddImage} 
                    disabled={!imageToUpload || addImageMutation.isPending}
                  >
                    {addImageMutation.isPending ? "Uploading..." : "Add to Gallery"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
            {profile.galleryImages && profile.galleryImages.length > 0 ? (
              profile.galleryImages.map((imageUrl, index) => (
                <div key={index} className="relative group aspect-square">
                  <img 
                    src={imageUrl} 
                    alt={`Gallery item ${index + 1}`} 
                    className="w-full h-full object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => removeImageMutation.mutate(imageUrl)}
                      className="h-8 px-2"
                    >
                      <Trash2 size={16} className="mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full border rounded-md p-4 text-center text-muted-foreground">
                No photos in your gallery yet. Add your first photo!
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}