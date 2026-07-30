"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Camera, MapPin, Clock, CheckCircle2, X, LogIn, LogOut, FlipHorizontal } from "lucide-react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function AttendanceContent() {
  const { user } = useAuth();

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Attendance state
  const [clockInDone, setClockInDone] = useState(false);
  const [clockOutDone, setClockOutDone] = useState(false);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clocking, setClocking] = useState(false);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [selfieBase64, setSelfieBase64] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");

  useEffect(function () {
    if (!user) return;
    const today = getTodayKey();
    const storedDate = localStorage.getItem("attendance_date_" + user.email);
    if (storedDate !== today) {
      localStorage.removeItem("attendance_clockin_" + user.email);
      localStorage.removeItem("attendance_clockout_" + user.email);
      localStorage.removeItem("attendance_clockin_time_" + user.email);
      localStorage.removeItem("attendance_clockout_time_" + user.email);
      localStorage.setItem("attendance_date_" + user.email, today);
      setClockInDone(false); setClockOutDone(false); setClockInTime(""); setClockOutTime("");
    } else {
      setClockInDone(localStorage.getItem("attendance_clockin_" + user.email) === "true");
      setClockOutDone(localStorage.getItem("attendance_clockout_" + user.email) === "true");
      setClockInTime(localStorage.getItem("attendance_clockin_time_" + user.email) || "");
      setClockOutTime(localStorage.getItem("attendance_clockout_time_" + user.email) || "");
    }
  }, [user]);

  // Stop camera stream helper
  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  // Open in-browser camera
  async function openCamera() {
    setCameraError("");
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError("Camera access denied. Please allow camera permission and try again.");
    }
  }

  // Flip camera
  async function flipCamera() {
    stopStream();
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError("Failed to switch camera.");
    }
  }

  // Take a photo from the video stream
  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfiePreview(dataUrl);
    setSelfieBase64(dataUrl);
    stopStream();
    setShowCamera(false);
  }

  // Close camera without taking photo
  function closeCamera() {
    stopStream();
    setShowCamera(false);
    setCameraError("");
  }

  // Cleanup on unmount
  useEffect(() => { return () => { stopStream(); }; }, []);

  async function getLocation(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) return null;
    try {
      const pos = await new Promise<GeolocationPosition>(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { return null; }
  }

  async function handleClockIn() {
    if (!user || clockInDone) return;
    if (!selfieBase64) {
      await openCamera();
      return;
    }
    setClocking(true);
    try {
      const loc = await getLocation();
      const lat = loc?.lat || 0; const lng = loc?.lng || 0;
      setGpsLat(lat); setGpsLng(lng);
      const res = await api.clockIn(user.email, lat, lng, selfieBase64 || undefined);
      if (res.success) {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setClockInDone(true); setClockInTime(time);
        localStorage.setItem("attendance_clockin_" + user.email, "true");
        localStorage.setItem("attendance_clockin_time_" + user.email, time);
      }
    } catch {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setClockInDone(true); setClockInTime(time);
      localStorage.setItem("attendance_clockin_" + user.email, "true");
      localStorage.setItem("attendance_clockin_time_" + user.email, time);
    } finally { setClocking(false); }
  }

  async function handleClockOut() {
    if (!user || !clockInDone || clockOutDone) return;
    setClocking(true);
    try {
      const loc = await getLocation();
      const lat = loc?.lat || 0; const lng = loc?.lng || 0;
      setGpsLat(lat); setGpsLng(lng);
      const res = await api.clockOut(user.email, lat, lng);
      if (res.success) {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setClockOutDone(true); setClockOutTime(time);
        localStorage.setItem("attendance_clockout_" + user.email, "true");
        localStorage.setItem("attendance_clockout_time_" + user.email, time);
      }
    } catch {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setClockOutDone(true); setClockOutTime(time);
      localStorage.setItem("attendance_clockout_" + user.email, "true");
      localStorage.setItem("attendance_clockout_time_" + user.email, time);
    } finally { setClocking(false); }
  }

  const allDone = clockInDone && clockOutDone;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="gradient-header text-white p-4 pb-6">
        <h1 className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5" /> Attendance</h1>
        <p className="text-blue-200 text-xs">{today}</p>
      </div>

      {/* In-browser Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/70">
            <span className="text-white text-sm font-semibold">Take Selfie</span>
            <button onClick={flipCamera} className="text-white p-2">
              <FlipHorizontal className="w-6 h-6" />
            </button>
            <button onClick={closeCamera} className="text-white p-2">
              <X className="w-6 h-6" />
            </button>
          </div>

          {cameraError ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <Camera className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-white text-center text-sm">{cameraError}</p>
              <Button className="mt-6" onClick={closeCamera}>Close</Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="flex-1 w-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
              <div className="bg-black/70 flex justify-center py-6">
                <button
                  onClick={takePhoto}
                  className="w-18 h-18 rounded-full bg-white border-4 border-blue-500 shadow-lg active:scale-95 transition-transform"
                  style={{ width: 72, height: 72 }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="-mt-3 px-4 space-y-4">
        {/* Status Card */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-100 p-1.5 rounded-lg"><Clock className="w-4 h-4 text-blue-600" /></div>
              <CardTitle className="text-sm font-semibold">Daily Status</CardTitle>
            </div>

            {/* Clock In Status */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${clockInDone ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${clockInDone ? "bg-emerald-100" : "bg-gray-100"}`}>
                  <LogIn className={`w-5 h-5 ${clockInDone ? "text-emerald-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Clock In</p>
                  <p className="text-xs text-gray-500">{clockInTime ? "At " + clockInTime : "Not done"}</p>
                </div>
              </div>
              {clockInDone && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Done</span>}
            </div>

            {/* Clock Out Status */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${clockOutDone ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${clockOutDone ? "bg-emerald-100" : "bg-gray-100"}`}>
                  <LogOut className={`w-5 h-5 ${clockOutDone ? "text-emerald-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Clock Out</p>
                  <p className="text-xs text-gray-500">{clockOutTime ? "At " + clockOutTime : "Not done"}</p>
                </div>
              </div>
              {clockOutDone && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Done</span>}
            </div>

            {allDone && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <p className="text-sm font-semibold text-emerald-700">Attendance completed for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card className="card-shadow border-0">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-amber-100 p-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4 text-amber-600" /></div>
              <CardTitle className="text-sm font-semibold">Action Requirements</CardTitle>
            </div>

            {/* Selfie */}
            {!clockInDone ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="p-2 bg-blue-100 rounded-xl"><Camera className="w-4 h-4 text-blue-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Selfie Capture</p>
                  <p className="text-xs text-gray-500">Required for clock in</p>
                </div>
                {selfiePreview ? (
                  <div className="relative">
                    <img src={selfiePreview} alt="Selfie" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500" />
                    <button type="button" className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow" onClick={function () { setSelfiePreview(""); setSelfieBase64(""); }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={openCamera} className="rounded-xl">Capture</Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <div className="p-2 bg-emerald-100 rounded-xl"><Camera className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1"><p className="text-sm font-semibold">Selfie Capture</p><p className="text-xs text-gray-500">Completed at clock in</p></div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Done</span>
              </div>
            )}

            {/* GPS */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="p-2 bg-blue-100 rounded-xl"><MapPin className="w-4 h-4 text-blue-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold">GPS Location</p>
                <p className="text-xs text-gray-500">{clockInDone ? "Required for clock out" : "Required for clock in"}</p>
              </div>
              {gpsLat !== null && gpsLng !== null && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Captured</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!clockInDone && (
          <Button className="w-full h-14 rounded-xl gradient-primary text-white font-semibold text-base shadow-lg hover:opacity-90 transition-opacity" size="lg" onClick={handleClockIn} disabled={clocking}>
            {clocking ? "Processing..." : !selfieBase64 ? "Capture Selfie First" : "Clock In"}
          </Button>
        )}

        {clockInDone && !clockOutDone && (
          <Button className="w-full h-14 rounded-xl gradient-danger text-white font-semibold text-base shadow-lg hover:opacity-90 transition-opacity" size="lg" onClick={handleClockOut} disabled={clocking}>
            {clocking ? "Processing..." : "Clock Out"}
          </Button>
        )}

        {allDone && (
          <Button className="w-full h-14 rounded-xl bg-emerald-600 text-white font-semibold text-base cursor-not-allowed" size="lg" disabled>
            Attendance Completed
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Attendance() {
  return <AuthGuard><AttendanceContent /></AuthGuard>;
}
