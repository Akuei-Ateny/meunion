import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { ArrowLeft, ArrowRight, Upload, X, MapPin, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { UserGender, GenderPreference, UserVibe, CampusBuilding } from '@/types/database';

type Step = 'basics' | 'photos' | 'gender' | 'interests' | 'location' | 'review';

interface VibeOption {
  id: string;
  label: UserVibe;
  emoji: string;
}

const vibeOptions: VibeOption[] = [
  { id: 'party', label: 'Looking to Party', emoji: '🍻' },
  { id: 'catch-up', label: 'Looking to Catch Up', emoji: '💬' },
  { id: 'roam', label: 'Down to Roam', emoji: '🧡' },
  { id: 'hook-up', label: 'Looking for a Hook-Up', emoji: '❤️' },
  { id: 'night', label: "🌙 Let's Just See Where the Night Takes Us", emoji: '🌙' },
  { id: 'deeper', label: '💑 Looking for Something Deeper', emoji: '💑' },
];

const genderOptions: { value: UserGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

const preferenceOptions: { value: GenderPreference; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'everyone', label: 'Everyone' },
];

const contactOptions = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both', label: 'Both' },
];

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_MB = 5;
const MAX_INTERESTS = 5;
const MAX_CLUBS = 3;

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setProfileComplete } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [stepNumber, setStepNumber] = useState(1);
  const totalSteps = 6;

  // BASIC INFO
  const [name, setName] = useState('');
  const [classYear, setClassYear] = useState('');
  const [major, setMajor] = useState('');
  const [bio, setBio] = useState('');
  const [contactPreference, setContactPreference] = useState<'email' | 'phone' | 'both'>('email');

  // PHOTOS
  const [photos, setPhotos] = useState<{ url: string; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GENDER & VIBE
  const [gender, setGender] = useState<UserGender | ''>('');
  const [genderPreference, setGenderPreference] = useState<GenderPreference>('everyone');
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  // INTERESTS & CLUBS
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [availableClubs, setAvailableClubs] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  // LOCATION
  const [buildings, setBuildings] = useState<CampusBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // FETCH OPTIONS
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: interestsData, error: intError } = await supabase
          .from('interests').select('name').order('name');
        if (intError) throw intError;
        setAvailableInterests(interestsData.map(i => i.name));

        const { data: clubsData, error: clubError } = await supabase
          .from('clubs').select('name').order('name');
        if (clubError) throw clubError;
        setAvailableClubs(clubsData.map(c => c.name));

        const { data: bldgData, error: bError } = await supabase
          .from('campus_buildings').select('*').order('name');
        if (bError) throw bError;
        setBuildings(bldgData);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load options');
      }
    }
    fetchData();
  }, []);

  // STEP NAVIGATION
  const handleContinue = () => {
    // validate basics
    if (currentStep === 'basics') {
      if (!name || !classYear || !major) {
        toast.error('Please complete all required fields');
        return;
      }
      setCurrentStep('photos'); setStepNumber(2);
    } else if (currentStep === 'photos') {
      if (photos.length === 0) {
        toast.error('Add at least one photo');
        return;
      }
      setCurrentStep('gender'); setStepNumber(3);
    } else if (currentStep === 'gender') {
      if (!gender || !selectedVibe) {
        toast.error('Select gender & vibe');
        return;
      }
      setCurrentStep('interests'); setStepNumber(4);
    } else if (currentStep === 'interests') {
      if (!selectedInterests.length || !selectedClubs.length) {
        toast.error('Select at least one interest and one club');
        return;
      }
      setCurrentStep('location'); setStepNumber(5);
    } else if (currentStep === 'location') {
      if (!selectedBuilding) {
        toast.error('Select your location');
        return;
      }
      setCurrentStep('review'); setStepNumber(6);
    } else {
      handleSubmitProfile();
    }
  };

  const handleBack = () => {
    if (currentStep === 'basics') {
      navigate('/');
      return;
    }
    const order: Step[] = ['basics','photos','gender','interests','location','review'];
    const idx = order.indexOf(currentStep);
    setCurrentStep(order[idx - 1]);
    setStepNumber(idx);
  };

  // PHOTO HANDLERS
  const handleAddPhotoClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) return toast.error(`Max ${MAX_PHOTOS} photos`);
    if (file.size > MAX_PHOTO_SIZE_MB * 1024*1024)
      return toast.error(`Each <${MAX_PHOTO_SIZE_MB}MB`);
    const url = URL.createObjectURL(file);
    setPhotos([...photos, { url, file }]);
    e.target.value = '';
  };
  const handleRemovePhoto = (i: number) => {
    URL.revokeObjectURL(photos[i].url);
    setPhotos(photos.filter((_, idx) => idx !== i));
  };

  // INTERESTS & CLUBS
  const toggleInterest = (i: string) => {
    if (selectedInterests.includes(i)) setSelectedInterests(si => si.filter(x=>x!==i));
    else if (selectedInterests.length < MAX_INTERESTS) setSelectedInterests(si => [...si, i]);
    else toast.error(`Max ${MAX_INTERESTS}`);
  };
  const toggleClub = (c: string) => {
    if (selectedClubs.includes(c)) setSelectedClubs(sc => sc.filter(x=>x!==c));
    else if (selectedClubs.length < MAX_CLUBS) setSelectedClubs(sc => [...sc, c]);
    else toast.error(`Max ${MAX_CLUBS}`);
  };
  const addNewInterest = () => {
    if (!newInterest.trim()) return;
    if (availableInterests.includes(newInterest) || selectedInterests.includes(newInterest))
      return toast.error('Already exists');
    if (selectedInterests.length >= MAX_INTERESTS) return toast.error(`Max ${MAX_INTERESTS}`);
    setAvailableInterests(ai => [...ai, newInterest]);
    setSelectedInterests(si => [...si, newInterest]);
    setNewInterest('');
  };

  // LOCATION
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (v: number) => v * Math.PI/180;
    const R = 6371e3;
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const dφ = toRad(lat2 - lat1), dλ = toRad(lng2 - lng1);
    const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  const findNearestBuilding = () => {
    setIsLocating(true); setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation unsupported'); setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: uLat, longitude: uLng } = pos.coords;
        let nearest = buildings[0], minD = Infinity;
        buildings.forEach(b => {
          const d = calculateDistance(uLat, uLng, b.latitude, b.longitude);
          if (d < minD) { minD = d; nearest = b; }
        });
        setSelectedBuilding(nearest);
        toast.success(`Location: ${nearest.name}`);
        setIsLocating(false);
      },
      () => {
        setLocationError('Could not get location'); setIsLocating(false);
        toast.error('Location error');
      }
    );
  };

  // SUBMIT
  const handleSubmitProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return toast.error('Login required');
      toast.info('Uploading photos…');
      const uploaded: string[] = [];
      for (let p of photos) {
        try {
          const url = await uploadToCloudinary(p.file);
          if (url) uploaded.push(url);
        } catch {}
      }
      // upsert user
      const payload = {
        auth_id: session.user.id,
        name,
        class_year: classYear,
        role: undefined, // only on insert
        major,
        bio,
        vibe: vibeOptions.find(v=>v.id===selectedVibe)?.label,
        gender,
        gender_preference: genderPreference,
        contact_preference: contactPreference,
        building: selectedBuilding?.name,
        location: selectedBuilding?.name,
        latitude: selectedBuilding?.latitude,
        longitude: selectedBuilding?.longitude,
        photo_urls: uploaded.length ? uploaded : null,
        profile_complete: true,
      };
      const { data: existing } = await supabase
        .from('users').select('id').eq('auth_id', session.user.id).maybeSingle();
      let userRow;
      if (existing) {
        const { data, error } = await supabase
          .from('users').update(payload).eq('auth_id', session.user.id).select().single();
        if (error) throw error;
        userRow = data;
      } else {
        const { data, error } = await supabase
          .from('users').insert({ ...payload, role: 'current_student' }).select().single();
        if (error) throw error;
        userRow = data;
      }
      // clear & link interests/clubs
      await supabase.from('user_interests').delete().eq('user_id', userRow.id);
      await supabase.from('user_clubs').delete().eq('user_id', userRow.id);
      for (let i of selectedInterests) {
        let { data: ex } = await supabase.from('interests').select('id')
          .eq('name', i).maybeSingle();
        let iid = ex?.id;
        if (!iid) {
          const { data: ni } = await supabase.from('interests').insert({ name: i }).select().single();
          iid = ni.id;
        }
        await supabase.from('user_interests').insert({ user_id: userRow.id, interest_id: iid });
      }
      for (let c of selectedClubs) {
        let { data: ex } = await supabase.from('clubs').select('id')
          .eq('name', c).maybeSingle();
        let cid = ex?.id;
        if (!cid) {
          const { data: nc } = await supabase.from('clubs').insert({ name: c }).select().single();
          cid = nc.id;
        }
        await supabase.from('user_clubs').insert({ user_id: userRow.id, club_id: cid });
      }

      setProfileComplete(true);
      toast.success('Profile complete!');
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      toast.error('Error completing profile');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-black to-[#121212]">
      {/* HEADER */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <button onClick={handleBack} className="text-princeton-white hover:text-princeton-orange">
          <ArrowLeft size={24} />
        </button>
        <Logo />
        <div className="w-6" />
      </header>

      {/* PROGRESS & CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          {/* progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              {/* <h1 className="text-2xl font-bold text-princeton-white">Complete Your Profile</h1> */}
              <span className="text-princeton-white/60 text-sm">
                Step {stepNumber} of {totalSteps}
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full tiger-gradient transition-all duration-300"
                style={{ width: `${(stepNumber/totalSteps)*100}%` }}
              />
            </div>
          </div>

          {/* step content */}
          <div className="animate-fade-in">
            {currentStep === 'basics' && (
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm text-princeton-white/80">Your Name</label>
                  <input
                    id="name" type="text" value={name}
                    onChange={e=>setName(e.target.value)}
                    placeholder="Name displayed to others"
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white focus:ring-2 focus:ring-princeton-orange"
                  />
                </div>
                {/* Class Year */}
                <div className="space-y-2">
                  <label htmlFor="classYear" className="block text-sm text-princeton-white/80">Class Year</label>
                  <input
                    id="classYear" type="text" value={classYear}
                    onChange={e=>setClassYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white focus:ring-2 focus:ring-princeton-orange"
                  />
                </div>
                {/* Major */}
                <div className="space-y-2">
                  <label htmlFor="major" className="block text-sm text-princeton-white/80">Major</label>
                  <input
                    id="major" type="text" value={major}
                    onChange={e=>setMajor(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white focus:ring-2 focus:ring-princeton-orange"
                  />
                </div>
                {/* Contact Preference */}
                <div className="space-y-2">
                  <label htmlFor="contactPref" className="block text-sm text-princeton-white/80">Contact Preference</label>
                  <select
                    id="contactPref" value={contactPreference}
                    onChange={e=>setContactPreference(e.target.value as any)}
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white focus:ring-2 focus:ring-princeton-orange"
                  >
                    {contactOptions.map(o=>(
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {/* Bio */}
                <div className="space-y-2">
                  <label htmlFor="bio" className="block text-sm text-princeton-white/80">Bio (optional)</label>
                  <textarea
                    id="bio" rows={3} value={bio}
                    onChange={e=>setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full p-3 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white focus:ring-2 focus:ring-princeton-orange resize-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 'photos' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white">Add Photos</h2>
                  <p className="text-princeton-white/70 text-sm">Up to 6 photos</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(MAX_PHOTOS)].map((_, i) => {
                    const has = photos[i];
                    return (
                      <div key={i} className={`aspect-square rounded-lg overflow-hidden relative flex items-center justify-center ${has ? '' : 'border-2 border-dashed border-princeton-orange/30'}`}>
                        {has ? (
                          <>
                            <img src={has.url} alt={`photo ${i+1}`} className="w-full h-full object-cover"/>
                            <button onClick={()=>handleRemovePhoto(i)} className="absolute top-1 right-1 bg-black/70 rounded-full p-1">
                              <X size={16} className="text-white"/>
                            </button>
                          </>
                        ) : (
                          <button onClick={handleAddPhotoClick} className="text-princeton-white/50 hover:text-princeton-orange">
                            <Upload size={24} /><div className="text-xs mt-1">Add</div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-xs text-princeton-white/60">
                  First photo becomes your main profile pic
                </div>
              </div>
            )}

            {currentStep === 'gender' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white">About You</h2>
                  <p className="text-princeton-white/70 text-sm">Tell us about yourself</p>
                </div>
                {/* Gender */}
                <div>
                  <label className="block text-sm text-princeton-white/80 mb-2">Your Gender</label>
                  <div className="grid grid-cols-2 gap-2">
                    {genderOptions.map(o=>(
                      <button
                        key={o.value}
                        onClick={()=>setGender(o.value)}
                        className={`p-3 rounded-lg border text-center ${
                          gender===o.value
                            ? 'bg-princeton-orange text-black'
                            : 'bg-secondary text-white hover:border-princeton-orange/60'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Preference */}
                <div>
                  <label className="block text-sm text-princeton-white/80 mb-2">Show Me</label>
                  <div className="grid grid-cols-3 gap-2">
                    {preferenceOptions.map(o=>(
                      <button
                        key={o.value}
                        onClick={()=>setGenderPreference(o.value)}
                        className={`p-3 rounded-lg border text-center ${
                          genderPreference===o.value
                            ? 'bg-princeton-orange text-black'
                            : 'bg-secondary text-white hover:border-princeton-orange/60'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Vibe */}
                <div>
                  <label className="block text-sm text-princeton-white/80 mb-2">Your Vibe</label>
                  <div className="grid grid-cols-2 gap-3">
                    {vibeOptions.map(v=>(
                      <button
                        key={v.id}
                        onClick={()=>setSelectedVibe(v.id)}
                        className={`p-4 rounded-lg border text-left ${
                          selectedVibe===v.id
                            ? 'bg-princeton-orange text-black'
                            : 'bg-secondary text-white hover:border-princeton-orange/60'
                        }`}
                      >
                        <div className="text-2xl mb-1">{v.emoji}</div>
                        <div className="text-sm">{v.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'interests' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white">Interests & Clubs</h2>
                  <p className="text-princeton-white/70 text-sm">
                    Up to {MAX_INTERESTS} interests & {MAX_CLUBS} clubs
                  </p>
                </div>
                {/* Interests */}
                <div>
                  <label className="flex justify-between text-sm text-princeton-white/80 mb-2">
                    <span>Interests</span>
                    <span className="text-princeton-orange">{selectedInterests.length}/{MAX_INTERESTS}</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedInterests.map(i=>(
                      <button key={i} onClick={()=>toggleInterest(i)} className="px-3 py-1 bg-princeton-orange text-black rounded-full flex items-center gap-1 text-sm">
                        {i}<X size={14}/>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={e=>setNewInterest(e.target.value)}
                      placeholder="Add new interest..."
                      className="flex-1 p-2 rounded-lg bg-secondary border border-princeton-orange/30 text-princeton-white"
                    />
                    <button
                      onClick={addNewInterest}
                      disabled={!newInterest.trim() || selectedInterests.length>=MAX_INTERESTS}
                      className="px-3 py-1 bg-princeton-orange text-black rounded-lg disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-secondary/50 rounded-lg p-2">
                    <div className="flex flex-wrap gap-2">
                      {availableInterests.filter(i=>!selectedInterests.includes(i)).map(i=>(
                        <button
                          key={i}
                          onClick={()=>toggleInterest(i)}
                          disabled={selectedInterests.length>=MAX_INTERESTS}
                          className="px-3 py-1 bg-secondary text-princeton-white/80 rounded-full text-sm hover:bg-secondary/80 disabled:opacity-50"
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Clubs */}
                <div>
                  <label className="flex justify-between text-sm text-princeton-white/80 mb-2">
                    <span>Clubs</span>
                    <span className="text-princeton-orange">{selectedClubs.length}/{MAX_CLUBS}</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedClubs.map(c=>(
                      <button key={c} onClick={()=>toggleClub(c)} className="px-3 py-1 bg-princeton-orange text-black rounded-full flex items-center gap-1 text-sm">
                        {c}<X size={14}/>
                      </button>
                    ))}
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-secondary/50 rounded-lg p-2">
                    <div className="flex flex-wrap gap-2">
                      {availableClubs.filter(c=>!selectedClubs.includes(c)).map(c=>(
                        <button
                          key={c}
                          onClick={()=>toggleClub(c)}
                          disabled={selectedClubs.length>=MAX_CLUBS}
                          className="px-3 py-1 bg-secondary text-princeton-white/80 rounded-full text-sm hover:bg-secondary/80 disabled:opacity-50"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'location' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white">Your Location</h2>
                  <p className="text-princeton-white/70 text-sm">Select campus building</p>
                </div>
                <div className="flex justify-center mb-4">
                  <button
                    onClick={findNearestBuilding}
                    disabled={isLocating}
                    className="flex items-center gap-2 px-4 py-2 bg-princeton-orange rounded-lg text-black hover:bg-princeton-orange/90 disabled:opacity-70"
                  >
                    {isLocating ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
                    <span>{isLocating ? 'Finding...' : 'Use Current Location'}</span>
                  </button>
                </div>
                {locationError && <p className="text-red-400 text-sm text-center mb-4">{locationError}</p>}
                <div className="max-h-80 overflow-y-auto bg-secondary/80 rounded-lg">
                  {buildings.map(b=>(
                    <button
                      key={b.id}
                      onClick={()=>setSelectedBuilding(b)}
                      className={`w-full flex items-center justify-between p-3 border-b border-princeton-white/10 ${
                        selectedBuilding?.id===b.id ? 'bg-princeton-orange/20' : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-princeton-orange/80" />
                        <span className="text-princeton-white">{b.name}</span>
                      </div>
                      {selectedBuilding?.id===b.id && <Check size={18} className="text-princeton-orange" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'review' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-princeton-white">Review Your Profile</h2>
                  <p className="text-princeton-white/70 text-sm">Double-check before finishing</p>
                </div>
                <div className="space-y-4">
                  {/* Photo + Name */}
                  <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img src={photos[0]?.url || '/placeholder.svg'} alt="pfp" className="w-full h-full object-cover"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-princeton-white">{name}</h3>
                      <p className="text-sm text-princeton-white/70">Class of {classYear}</p>
                      <p className="text-sm text-princeton-white/70">{selectedBuilding?.name || 'No location'}</p>
                    </div>
                  </div>
                  {/* Basic Info */}
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-princeton-white/70 mb-2">Basic Info</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-princeton-white/60">Major:</span>
                        <span className="text-princeton-white">{major}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-princeton-white/60">Gender:</span>
                        <span className="text-princeton-white">{gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-princeton-white/60">Show Me:</span>
                        <span className="text-princeton-white">
                          {preferenceOptions.find(o=>o.value===genderPreference)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-princeton-white/60">Vibe:</span>
                        <span className="text-princeton-white">
                          {vibeOptions.find(v=>v.id===selectedVibe)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-princeton-white/60">Contact Pref.:</span>
                        <span className="text-princeton-white">
                          {contactOptions.find(o=>o.value===contactPreference)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Photos */}
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-princeton-white/70 mb-2">Photos</h3>
                    <div className="grid grid-cols-6 gap-1">
                      {photos.map((p,i)=>(<div key={i} className="aspect-square rounded overflow-hidden"><img src={p.url} alt="" className="w-full h-full object-cover"/></div>))}
                    </div>
                  </div>
                  {/* Interests & Clubs */}
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-princeton-white/70 mb-2">Interests & Clubs</h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedInterests.map((i,i2)=><span key={i2} className="px-2 py-1 bg-secondary rounded-full text-princeton-white text-xs">{i}</span>)}
                      {selectedClubs.map((c,c2)=><span key={c2} className="px-2 py-1 bg-secondary rounded-full text-princeton-white text-xs">{c}</span>)}
                    </div>
                  </div>
                  {/* Bio */}
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-princeton-white/70 mb-2">Bio</h3>
                    <p className="text-princeton-white/90">{bio || 'No bio provided'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* CONTINUE / COMPLETE */}
            <div className="mt-8">
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-princeton-orange rounded-lg text-black font-medium flex items-center justify-center gap-2 hover:bg-princeton-orange/90"
              >
                <span>{currentStep === 'review' ? 'Complete Profile' : 'Continue'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSetupPage;
