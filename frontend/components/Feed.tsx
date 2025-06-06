"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { Image, FileImage, Smile, BarChart, MapPin, Camera } from "lucide-react";
import TweetsList from "./TweetList";
import Tabs from "./Tabs";
import { GET_TWEETS, GET_ALL_TWEETS } from "@/graphql/queries";
import { useAuth } from "@/app/context/AuthContext";

export default function Feed() {
  // const [activeTab, setActiveTab] = useState("forYou");
  const [activeTabTyped, setActiveTabTyped] = useState<"forYou" | "following">("forYou");
  const [newTweet, setNewTweet] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoggedIn, accessToken } = useAuth();

  const [mediaTypes] = useState("image/*,video/*");

  // const { data, loading, error } = useQuery(GET_TWEETS, {
  //   fetchPolicy: "cache-and-network",
  // });
  // Choix de la requête en fonction de l'état de connexion
  // console.log(appState?.isLoggedIn);
  const { data, loading, error } = useQuery(isLoggedIn ? GET_TWEETS : GET_ALL_TWEETS, {
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      console.log("✅ Query completed:", data);
    },
    onError: (error) => {
      console.log("❌ Query error:", error);
    }
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handlePostTweet = useCallback(async () => {
    if (!isLoggedIn) return;
    if (!newTweet.trim() && !selectedFile) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", newTweet);
      if (selectedFile) formData.append("media", selectedFile);
      const response = await fetch("http://localhost:5000/api/tweets", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(await response.text());
      setNewTweet("");
      removeSelectedFile();
    } catch (error) {
      console.error("Error posting tweet:", error);
    } finally {
      setIsLoading(false);
    }
  }, [newTweet, selectedFile, removeSelectedFile, accessToken]);

  return (
      <div className="flex justify-center w-full">
        <div className="max-w-lg w-full bg-white shadow-md rounded-lg p-4">
          <Tabs setActiveTab={setActiveTabTyped} activeTab={activeTabTyped} />
          {error && <div className="bg-red-500 text-white p-2 rounded mb-2">{error.message}</div>}
          <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
            {isLoggedIn ? (
              <>
              <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 
                  placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What's happening?"
                  value={newTweet}
                  onChange={(e) => setNewTweet(e.target.value)}
                  disabled={isLoading}
              />
                {filePreview && (
                    <div className="relative mt-2 mb-2">
                      {selectedFile?.type.startsWith("image/") ? (
                          <img src={filePreview} alt="Preview" className="w-full max-h-80 rounded-lg object-contain" />
                      ) : (
                          <video src={filePreview} controls className="w-full max-h-80 rounded-lg" />
                      )}
                      <button
                          onClick={removeSelectedFile}
                          className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 rounded-full p-1 text-white"
                      >
                        ✕
                      </button>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept={mediaTypes} className="hidden" />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex space-x-3 text-blue-500">
                    {[Image, FileImage, BarChart, Smile, Camera, MapPin].map((Icon, index) => (
                        <button key={index} className="hover:text-blue-400" onClick={triggerFileInput}>
                          <Icon size={20} />
                        </button>
                    ))}
                  </div>
                  
                  <button
                      className={`px-4 py-2 rounded text-white ${newTweet.trim() || selectedFile ? 
                        "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"}`}
                      onClick={handlePostTweet}
                      disabled={!newTweet.trim() && !selectedFile || isLoading}
                  >
                    {isLoading ? "Posting..." : "Post"}
                  </button>
                </div>
            </>
            ) : (
               <p className="text-center text-gray-500">
                Connecte-toi pour publier un tweet.
              </p>
            )}
          </div>
          
          {isLoggedIn ? (
          <TweetsList 
            tweets={data?.getTimeline?.tweets || []}
            loading={loading}
            followingUsers={Array.isArray(data?.getTimeline?.followingUsers) ? data.getTimeline.followingUsers : []}
          />
          ) : (
            <TweetsList 
              tweets={data?.publicTimeline || []}
              loading={loading}
              followingUsers={[]}
            />
          )}
        </div>
      </div>
  );
}