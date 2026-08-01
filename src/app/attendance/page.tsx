"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Camera, MapPin, Clock, CheckCircle2, X, LogIn, LogOut, RotateCcw } from "lucide-react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function AttendanceContent() {
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

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

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (t) { t.stop(); });
      streamRef.current = null;
    }
  }

  async function openCamera() {
    setCameraError("");
    setFacingMode("user");
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError("Camera access denied. Please allow camera permission in your phone settings and try again.");
    }
  }

  async function flipCamera() {
    stopStream();
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 640 }, height: { ideal: 480 } },
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

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const maxW = 400;
    const ratio = video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1;
    const w = Math.min(video.videoWidth || 640, maxW);
    const h = Math.round(w / ratio);

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    setSelfiePreview(dataUrl);
    setSelfieBase64(dataUrl);
    stopStream();
    setShowCamera(false);
  }

  function closeCamera() {
    stopStream();
    setShowCamera(false);
    setCameraError("");
  }

  function retakeSelfie() {
    setSelfiePreview("");
    setSelfieBase64("");
    openCamera();
  }

  useEffect(function () { return function () { stopStream(); }; }, []);

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
      const lat = loc?.lat || 0;
      const lng = loc?.lng || 0;
      setGpsLat(lat);
      setGpsLng(lng);
      const res = await api.clockIn(user.email, lat, lng, selfieBase64 || undefined);
      if (res.success) {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setClockInDone(true);
        setClockInTime(time);
        localStorage.setItem("attendance_clockin_" + user.email, "true");
        localStorage.setItem("attendance_clockin_time_" + user.email, time);
      }
    } catch {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setClockInDone(true);
      setClockInTime(time);
      localStorage.setItem("attendance_clockin_" + user.email, "true");
      localStorage.setItem("attendance_clockin_time_" + user.email, time);
    } finally { setClocking(false); }
  }

  async function handleClockOut() {
    if (!user || !clockInDone || clockOutDone) return;
    setClocking(true);
    try {
      const loc = await getLocation();
      const lat = loc?.lat || 0;
      const lng = loc?.lng || 0;
      setGpsLat(lat);
      setGpsLng(lng);
      const res = await api.clockOut(user.email, lat, lng);
      if (res.success) {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setClockOutDone(true);
        setClockOutTime(time);
        localStorage.setItem("attendance_clockout_" + user.email, "true");
        localStorage.setItem("attendance_clockout_time_" + user.email, time);
      }
    } catch {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setClockOutDone(true);
      setClockOutTime(time);
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

      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 safe-top">
            <span className="text-white text-sm font-semibold">Take Selfie</span>
            <div className="flex gap-2">
              <button onClick={flipCamera} className="text-white p-2 rounded-full bg-white/10">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={closeCamera} className="text-white p-2 rounded-full bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {cameraError ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <Camera className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-white text-center text-sm mb-4">{cameraError}</p>
              <Button className="rounded-xl" onClick={closeCamera}>Close</Button>
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
              <div className="bg-black/80 flex justify-center items-center" style={{ paddingTop: 16, paddingBottom: "max(3rem, calc(env(safe-area-inset-bottom, 24px) + 16px))" }}>
                <button
                  onClick={takePhoto}
                  className="rounded-full bg-white border-4 border-blue-500 shadow-lg active:scale-90 transition-transform"
                  style={{ width: 72, height: 72 }}
                  aria-label="Take photo"
                />
              </div>
            </>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="-mt-3 px-4 space-y-4">
        <Card className="card-shadow border-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-100 p-1.5 rounded-lg"><Clock className="w-4 h-4 text-blue-600" /></div>
              <CardTitle className="text-sm font-semibold">Daily Status</CardTitle>
            </div>

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

        {!allDone && (
          <Card className="card-shadow border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-amber-100 p-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4 text-amber-600" /></div>
                <CardTitle className="text-sm font-semibold">Requirements</CardTitle>
              </div>

              {!clockInDone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-blue-100 rounded-xl"><Camera className="w-4 h-4 text-blue-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Selfie</p>
                    <p className="text-[10px] text-gray-500">{selfiePreview ? "Ready" : "Tap button below to capture"}</p>
                  </div>
                  {selfiePreview && (
                    <div className="relative">
                      <img src={selfiePreview} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500" />
                      <button type="button" className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow" onClick={retakeSelfie}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!clockInDone && (
          <Button
            className="w-full h-14 rounded-xl gradient-primary text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
            size="lg"
            onClick={handleClockIn}
            disabled={clocking}
          >
            {clocking ? "Processing..." : !selfieBase64 ? "Capture Selfie & Clock In" : "Clock In"}
          </Button>
        )}

        {clockInDone && !clockOutDone && (
          <Button
            className="w-full h-14 rounded-xl gradient-danger text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
            size="lg"
            onClick={handleClockOut}
            disabled={clocking}
          >
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
