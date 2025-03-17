"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, gql } from "@apollo/client";
import { Image, FileImage, Smile, BarChart, MapPin, Camera } from "lucide-react";
import TweetsList from "./TweetList";
import Tabs from "./Tabs";
import { useAppContext } from "@/app/context/AppContext";
import { GET_TWEETS, GET_ALL_TWEETS } from "@/graphql/queries";

export default function Feed() {
  const [activeTab, setActiveTab] = useState("forYou");
  const [activeTabTyped, setActiveTabTyped] = useState("forYou");
  const [newTweet, setNewTweet] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { appState } = useAppContext();

  const [mediaTypes] = useState("image/*,video/*");

  // const { data, loading, error } = useQuery(GET_TWEETS, {
  //   fetchPolicy: "cache-and-network",
  // });
  // Choix de la requête en fonction de l'état de connexion
  const { data, loading, error } = useQuery(appState?.isLoggedIn ? GET_TWEETS : GET_ALL_TWEETS, {
    fetchPolicy: "cache-and-network",
  });

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
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
    if (!appState?.isLoggedIn) return;
    if (!newTweet.trim() && !selectedFile) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", newTweet);
      if (selectedFile) formData.append("media", selectedFile);
      const response = await fetch("http://localhost:5000/api/tweets", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${appState.token}` },
      });
      if (!response.ok) throw new Error(await response.text());
      setNewTweet("");
      removeSelectedFile();
    } catch (error) {
      console.error("Error posting tweet:", error);
    } finally {
      setIsLoading(false);
    }
  }, [newTweet, selectedFile, removeSelectedFile]);

  return (
      <div className="flex justify-center w-full">
        <div className="max-w-lg w-full bg-white shadow-md rounded-lg p-4">
          <Tabs setActiveTab={setActiveTabTyped} activeTab={activeTabTyped} />
          {error && <div className="bg-red-500 text-white p-2 rounded mb-2">{error.message}</div>}
          <div className="p-4 rounded-lg border border-gray-300 bg-gray-50">
          <textarea
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What's happening?"
              value={newTweet}
              onChange={(e) => setNewTweet(e.target.value)}
              disabled={isLoading}
          />
            {filePreview && (
                <div className="relative mt-2 mb-2">
                  {selectedFile.type.startsWith("image/") ? (
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
                  className={`px-4 py-2 rounded text-white ${newTweet.trim() || selectedFile ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"}`}
                  onClick={handlePostTweet}
                  disabled={!newTweet.trim() && !selectedFile || isLoading}
              >
                {isLoading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
          {appState?.isLoggedIn ? (
          <TweetsList tweets={data?.getTimeline || []} loading={loading} />
        ) : (
          <TweetsList tweets={data?.publicTimeline || []} loading={loading} />
        )}
        </div>
      </div>
  );
}