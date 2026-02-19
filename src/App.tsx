import React, { useState, useEffect } from 'react';
import { Heart, Thermometer, User, Activity, Shield, Bell, Settings, LogOut, Plus } from 'lucide-react';
import './App.css';

interface SensorData {
  temperature: string;
  heartRate: string;
  rfid: string;
}

interface PetProfile {
  name: string;
  breed: string;
  age: string;
  owner: string;
  weight: string;
  lastCheckup: string;
  favoriteThings: string[];
  foodPreferences: {
    type: 'veg' | 'non-veg' | 'both';
    favoriteFoods: string[];
    unsuitableFoods: string[];
    feedingSchedule: string;
  };
  healthGuidelines: {
    suitableTemperature: string;
    exerciseNeeds: string;
    groomingNeeds: string;
    specialCare: string[];
  };
  medicalHistory: {
    vaccinations: string[];
    allergies: string[];
    medications: string[];
  };
}

const App: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: '--',
    heartRate: '--',
    rfid: 'None'
  });
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [esp32IP, setEsp32IP] = useState<string>('10.209.67.103');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPet, setCurrentPet] = useState<PetProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [showNewPetForm, setShowNewPetForm] = useState<boolean>(false);

  // Enhanced pet database with detailed information
  const petDatabase: Record<string, PetProfile> = {
    'A1B2C3D4': { 
      name: 'Max', 
      breed: 'Golden Retriever', 
      age: '3 years', 
      owner: 'John Doe',
      weight: '32 kg',
      lastCheckup: '2024-12-15',
      favoriteThings: ['Playing fetch', 'Swimming', 'Car rides', 'Chew toys'],
      foodPreferences: {
        type: 'non-veg',
        favoriteFoods: ['Chicken', 'Salmon', 'Sweet potatoes', 'Carrots'],
        unsuitableFoods: ['Chocolate', 'Grapes', 'Onions', 'Avocado'],
        feedingSchedule: 'Twice daily - 8:00 AM & 6:00 PM'
      },
      healthGuidelines: {
        suitableTemperature: '18-24°C',
        exerciseNeeds: '60 minutes daily',
        groomingNeeds: 'Brush 3 times weekly, bath monthly',
        specialCare: ['Regular hip checkups', 'Dental cleaning every 6 months']
      },
      medicalHistory: {
        vaccinations: ['Rabies', 'Distemper', 'Parvovirus', 'Leptospirosis'],
        allergies: ['Pollen', 'Certain flea medications'],
        medications: ['Heartworm preventive monthly']
      }
    },
    'E5F6G7H8': { 
      name: 'Luna', 
      breed: 'Siamese Cat', 
      age: '2 years', 
      owner: 'Jane Smith',
      weight: '4.5 kg',
      lastCheckup: '2024-11-20',
      favoriteThings: ['Laser pointer', 'Catnip toys', 'High perches', 'Blankets'],
      foodPreferences: {
        type: 'non-veg',
        favoriteFoods: ['Tuna', 'Chicken', 'Salmon treats'],
        unsuitableFoods: ['Dairy products', 'Raw fish', 'Onions'],
        feedingSchedule: 'Small portions 4 times daily'
      },
      healthGuidelines: {
        suitableTemperature: '20-26°C',
        exerciseNeeds: '30 minutes daily play',
        groomingNeeds: 'Weekly brushing, nail trim monthly',
        specialCare: ['Regular dental care', 'Keep indoors only']
      },
      medicalHistory: {
        vaccinations: ['Rabies', 'Feline distemper', 'Calicivirus'],
        allergies: ['Dust', 'Certain cleaning products'],
        medications: ['Flea treatment monthly']
      }
    },
    'I9J0K1L2': { 
      name: 'Rocky', 
      breed: 'German Shepherd', 
      age: '5 years', 
      owner: 'Mike Johnson',
      weight: '38 kg',
      lastCheckup: '2024-12-01',
      favoriteThings: ['Running', 'Training sessions', 'Puzzle toys', 'Socializing'],
      foodPreferences: {
        type: 'both',
        favoriteFoods: ['Beef', 'Rice', 'Green beans', 'Apples'],
        unsuitableFoods: ['Chocolate', 'Macadamia nuts', 'Yeast dough'],
        feedingSchedule: 'Twice daily - 7:00 AM & 7:00 PM'
      },
      healthGuidelines: {
        suitableTemperature: '15-22°C',
        exerciseNeeds: '90 minutes daily with mental stimulation',
        groomingNeeds: 'Brush daily during shedding, bath every 2 months',
        specialCare: ['Hip and elbow monitoring', 'Regular training reinforcement']
      },
      medicalHistory: {
        vaccinations: ['Rabies', 'Distemper', 'Parvovirus', 'Bordetella'],
        allergies: ['Grass', 'Some chicken products'],
        medications: ['Joint supplements', 'Monthly preventives']
      }
    }
  };

  // Mock health history data
  const healthHistory = [
    { time: '10:30 AM', heartRate: '72', temperature: '38.2', status: 'normal' },
    { time: '10:00 AM', heartRate: '75', temperature: '38.1', status: 'normal' },
    { time: '09:30 AM', heartRate: '70', temperature: '38.3', status: 'normal' },
    { time: '09:00 AM', heartRate: '68', temperature: '38.0', status: 'normal' },
  ];

  // New pet form state
  const [newPet, setNewPet] = useState<Omit<PetProfile, 'rfid'>>({
    name: '',
    breed: '',
    age: '',
    owner: '',
    weight: '',
    lastCheckup: new Date().toISOString().split('T')[0],
    favoriteThings: [],
    foodPreferences: {
      type: 'both',
      favoriteFoods: [],
      unsuitableFoods: [],
      feedingSchedule: ''
    },
    healthGuidelines: {
      suitableTemperature: '',
      exerciseNeeds: '',
      groomingNeeds: '',
      specialCare: []
    },
    medicalHistory: {
      vaccinations: [],
      allergies: [],
      medications: []
    }
  });

  const [tempFavoriteThing, setTempFavoriteThing] = useState('');
  const [tempFavoriteFood, setTempFavoriteFood] = useState('');
  const [tempUnsuitableFood, setTempUnsuitableFood] = useState('');
  const [tempSpecialCare, setTempSpecialCare] = useState('');
  const [tempVaccination, setTempVaccination] = useState('');
  const [tempAllergy, setTempAllergy] = useState('');
  const [tempMedication, setTempMedication] = useState('');

  const fetchData = async (): Promise<void> => {
    if (!esp32IP) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://${esp32IP}/data`);
      const data = await response.json();

      const fullData: SensorData = {
        temperature: data.t || data.temperature || '--',
        heartRate: data.h || data.heartRate || '--',
        rfid: data.r || data.rfid || 'None'
      };

      setSensorData(fullData);
      setIsConnected(true);

      // Auto-login if RFID detected
      if (fullData.rfid !== 'None' && petDatabase[fullData.rfid] && !isLoggedIn) {
        setCurrentPet(petDatabase[fullData.rfid]);
        setIsLoggedIn(true);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [esp32IP, isLoggedIn]);

  const handleLogout = (): void => {
    setIsLoggedIn(false);
    setCurrentPet(null);
    setActiveTab('dashboard');
  };

  const getHeartStatus = (hr: string): { status: string; message: string } => {
    if (hr === '--') return { status: 'measuring', message: 'Measuring...' };
    const heartRateNum = parseInt(hr);
    if (heartRateNum < 60) return { status: 'warning', message: 'Low' };
    if (heartRateNum > 140) return { status: 'warning', message: 'High' };
    return { status: 'normal', message: 'Normal' };
  };

  const getTempStatus = (temp: string): { status: string; message: string } => {
    if (temp === '--') return { status: 'measuring', message: 'Measuring...' };
    const tempNum = parseFloat(temp);
    if (tempNum < 37.5) return { status: 'warning', message: 'Low' };
    if (tempNum > 39.2) return { status: 'danger', message: 'High' };
    return { status: 'normal', message: 'Normal' };
  };

  const addToList = (list: string[], updateList: (newList: string[]) => void, temp: string, setTemp: React.Dispatch<React.SetStateAction<string>>) => {
    if (temp.trim() && !list.includes(temp.trim())) {
      updateList([...list, temp.trim()]);
      setTemp('');
    }
  };

  const removeFromList = (list: string[], updateList: (newList: string[]) => void, item: string) => {
    updateList(list.filter(i => i !== item));
  };

  const handleAddNewPet = () => {
    // In a real app, you would save this to a database
    // For now, we'll just log it and close the form
    console.log('New pet data:', newPet);
    alert('New pet profile created successfully! (In a real app, this would be saved to database)');
    setShowNewPetForm(false);
    // Reset form
    setNewPet({
      name: '',
      breed: '',
      age: '',
      owner: '',
      weight: '',
      lastCheckup: new Date().toISOString().split('T')[0],
      favoriteThings: [],
      foodPreferences: {
        type: 'both',
        favoriteFoods: [],
        unsuitableFoods: [],
        feedingSchedule: ''
      },
      healthGuidelines: {
        suitableTemperature: '',
        exerciseNeeds: '',
        groomingNeeds: '',
        specialCare: []
      },
      medicalHistory: {
        vaccinations: [],
        allergies: [],
        medications: []
      }
    });
  };

  // Login Component
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-glass">
          <div className="login-header">
            <div className="logo">
              <Shield className="logo-icon" />
              <span>PawSense</span>
            </div>
            <h1>Welcome Back</h1>
            <p>Tap your RFID tag to access your pet's health dashboard</p>
          </div>

          <div className="scanner-section">
            <div className="scanner-visual">
              <div className="scanner-animation"></div>
              <User className="scanner-icon" />
            </div>
            <div className="scanner-info">
              <h3>RFID Scanner Ready</h3>
              <p>Place your pet's tag near the reader</p>
            </div>
            <div className="rfid-display">
              {sensorData.rfid !== 'None' ? (
                <div className="rfid-detected">
                  <span>Detected: {sensorData.rfid}</span>
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                'Waiting for tag...'
              )}
            </div>
          </div>

          <div className="connection-panel">
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span>ESP32 {isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            
            <div className="ip-input-group">
              <label>Enter ESP32 IP Address</label>
              <input 
                type="text" 
                value={esp32IP}
                onChange={(e) => setEsp32IP(e.target.value)}
                placeholder="192.168.1.xxx"
                className="ip-input"
              />
              <small style={{color: '#888', fontSize: '12px', marginTop: '5px'}}>
                🔍 Check Arduino Serial Monitor for IP address
              </small>
            </div>

            <div className="demo-buttons">
              <button 
                className="test-btn"
                onClick={() => {
                  const testRFID = 'A1B2C3D4';
                  setCurrentPet(petDatabase[testRFID]);
                  setIsLoggedIn(true);
                }}
              >
                <User size={16} />
                Demo Login (Max - Golden Retriever)
              </button>
              <button 
                className="test-btn secondary"
                onClick={() => setShowNewPetForm(true)}
              >
                <Plus size={16} />
                Add New Pet
              </button>
            </div>
          </div>

          {/* New Pet Form Modal */}
          {showNewPetForm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h2>Add New Pet Profile</h2>
                  <button className="close-btn" onClick={() => setShowNewPetForm(false)}>×</button>
                </div>
                
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-grid">
                    <input 
                      type="text" 
                      placeholder="Pet Name" 
                      value={newPet.name}
                      onChange={(e) => setNewPet({...newPet, name: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Breed" 
                      value={newPet.breed}
                      onChange={(e) => setNewPet({...newPet, breed: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Age" 
                      value={newPet.age}
                      onChange={(e) => setNewPet({...newPet, age: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Weight" 
                      value={newPet.weight}
                      onChange={(e) => setNewPet({...newPet, weight: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Owner Name" 
                      value={newPet.owner}
                      onChange={(e) => setNewPet({...newPet, owner: e.target.value})}
                    />
                    <input 
                      type="date" 
                      placeholder="Last Checkup" 
                      value={newPet.lastCheckup}
                      onChange={(e) => setNewPet({...newPet, lastCheckup: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Favorite Things</h3>
                  <div className="list-input-group">
                    <input 
                      type="text" 
                      placeholder="Add favorite activity/toy" 
                      value={tempFavoriteThing}
                      onChange={(e) => setTempFavoriteThing(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList(newPet.favoriteThings, (val) => setNewPet({...newPet, favoriteThings: val}), tempFavoriteThing, setTempFavoriteThing)}
                    />
                    <button onClick={() => addToList(newPet.favoriteThings, (val) => setNewPet({...newPet, favoriteThings: val}), tempFavoriteThing, setTempFavoriteThing)}>Add</button>
                  </div>
                  <div className="tag-list">
                    {newPet.favoriteThings.map((thing, index) => (
                      <span key={index} className="tag">
                        {thing}
                        <button onClick={() => removeFromList(newPet.favoriteThings, (val) => setNewPet({...newPet, favoriteThings: val}), thing)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Food Preferences</h3>
                  <select 
                    value={newPet.foodPreferences.type}
                    onChange={(e) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, type: e.target.value as 'veg' | 'non-veg' | 'both'}})}
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="both">Both</option>
                  </select>
                  
                  <div className="list-input-group">
                    <input 
                      type="text" 
                      placeholder="Favorite food" 
                      value={tempFavoriteFood}
                      onChange={(e) => setTempFavoriteFood(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList(newPet.foodPreferences.favoriteFoods, (val) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, favoriteFoods: val}}), tempFavoriteFood, setTempFavoriteFood)}
                    />
                    <button onClick={() => addToList(newPet.foodPreferences.favoriteFoods, (val) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, favoriteFoods: val}}), tempFavoriteFood, setTempFavoriteFood)}>Add</button>
                  </div>
                  <div className="tag-list">
                    {newPet.foodPreferences.favoriteFoods.map((food, index) => (
                      <span key={index} className="tag">
                        {food}
                        <button onClick={() => removeFromList(newPet.foodPreferences.favoriteFoods, (val) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, favoriteFoods: val}}), food)}>×</button>
                      </span>
                    ))}
                  </div>

                  <div className="list-input-group">
                    <input 
                      type="text" 
                      placeholder="Unsuitable food" 
                      value={tempUnsuitableFood}
                      onChange={(e) => setTempUnsuitableFood(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList(newPet.foodPreferences.unsuitableFoods, (val) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, unsuitableFoods: val}}), tempUnsuitableFood, setTempUnsuitableFood)}
                    />
                    <button onClick={() => addToList(newPet.foodPreferences.unsuitableFoods, (val) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, unsuitableFoods: val}}), tempUnsuitableFood, setTempUnsuitableFood)}>Add</button>
                  </div>
                  <div className="tag-list">
                    {newPet.foodPreferences.unsuitableFoods.map((food, index) => (
                      <span key={index} className="tag">
                        {food}
                        <button onClick={() => removeFromList(newPet.foodPreferences.unsuitableFoods, (val) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, unsuitableFoods: val}}), food)}>×</button>
                      </span>
                    ))}
                  </div>

                  <input 
                    type="text" 
                    placeholder="Feeding Schedule" 
                    value={newPet.foodPreferences.feedingSchedule}
                    onChange={(e) => setNewPet({...newPet, foodPreferences: {...newPet.foodPreferences, feedingSchedule: e.target.value}})}
                  />
                </div>

                <div className="form-section">
                  <h3>Health Guidelines</h3>
                  <input 
                    type="text" 
                    placeholder="Suitable Temperature Range" 
                    value={newPet.healthGuidelines.suitableTemperature}
                    onChange={(e) => setNewPet({...newPet, healthGuidelines: {...newPet.healthGuidelines, suitableTemperature: e.target.value}})}
                  />
                  <input 
                    type="text" 
                    placeholder="Exercise Needs" 
                    value={newPet.healthGuidelines.exerciseNeeds}
                    onChange={(e) => setNewPet({...newPet, healthGuidelines: {...newPet.healthGuidelines, exerciseNeeds: e.target.value}})}
                  />
                  <input 
                    type="text" 
                    placeholder="Grooming Needs" 
                    value={newPet.healthGuidelines.groomingNeeds}
                    onChange={(e) => setNewPet({...newPet, healthGuidelines: {...newPet.healthGuidelines, groomingNeeds: e.target.value}})}
                  />
                  
                  <div className="list-input-group">
                    <input 
                      type="text" 
                      placeholder="Special care requirements" 
                      value={tempSpecialCare}
                      onChange={(e) => setTempSpecialCare(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList(newPet.healthGuidelines.specialCare, (val) => setNewPet({...newPet, healthGuidelines: {...newPet.healthGuidelines, specialCare: val}}), tempSpecialCare, setTempSpecialCare)}
                    />
                    <button onClick={() => addToList(newPet.healthGuidelines.specialCare, (val) => setNewPet({...newPet, healthGuidelines: {...newPet.healthGuidelines, specialCare: val}}), tempSpecialCare, setTempSpecialCare)}>Add</button>
                  </div>
                  <div className="tag-list">
                    {newPet.healthGuidelines.specialCare.map((care, index) => (
                      <span key={index} className="tag">
                        {care}
                        <button onClick={() => removeFromList(newPet.healthGuidelines.specialCare, (val) => setNewPet({...newPet, healthGuidelines: {...newPet.healthGuidelines, specialCare: val}}), care)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Medical History</h3>
                  <div className="list-input-group">
                    <input 
                      type="text" 
                      placeholder="Vaccination" 
                      value={tempVaccination}
                      onChange={(e) => setTempVaccination(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList(newPet.medicalHistory.vaccinations, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, vaccinations: val}}), tempVaccination, setTempVaccination)}
                    />
                    <button onClick={() => addToList(newPet.medicalHistory.vaccinations, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, vaccinations: val}}), tempVaccination, setTempVaccination)}>Add</button>
                  </div>
                  <div className="tag-list">
                    {newPet.medicalHistory.vaccinations.map((vaccine, index) => (
                      <span key={index} className="tag">
                        {vaccine}
                        <button onClick={() => removeFromList(newPet.medicalHistory.vaccinations, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, vaccinations: val}}), vaccine)}>×</button>
                      </span>
                    ))}
                  </div>

                  <div className="list-input-group">
                    <input 
                      type="text" 
                      placeholder="Allergy" 
                      value={tempAllergy}
                      onChange={(e) => setTempAllergy(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList(newPet.medicalHistory.allergies, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, allergies: val}}), tempAllergy, setTempAllergy)}
                    />
                    <button onClick={() => addToList(newPet.medicalHistory.allergies, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, allergies: val}}), tempAllergy, setTempAllergy)}>Add</button>
                  </div>
                  <div className="tag-list">
                    {newPet.medicalHistory.allergies.map((allergy, index) => (
                      <span key={index} className="tag">
                        {allergy}
                        <button onClick={() => removeFromList(newPet.medicalHistory.allergies, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, allergies: val}}), allergy)}>×</button>
                      </span>
                    ))}
                  </div>

                  <div className="list-input-group">
                    <input 
                      type="text" 
                      placeholder="Medication" 
                      value={tempMedication}
                      onChange={(e) => setTempMedication(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addToList(newPet.medicalHistory.medications, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, medications: val}}), tempMedication, setTempMedication)}
                    />
                    <button onClick={() => addToList(newPet.medicalHistory.medications, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, medications: val}}), tempMedication, setTempMedication)}>Add</button>
                  </div>
                  <div className="tag-list">
                    {newPet.medicalHistory.medications.map((med, index) => (
                      <span key={index} className="tag">
                        {med}
                        <button onClick={() => removeFromList(newPet.medicalHistory.medications, (val) => setNewPet({...newPet, medicalHistory: {...newPet.medicalHistory, medications: val}}), med)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button className="cancel-btn" onClick={() => setShowNewPetForm(false)}>Cancel</button>
                  <button className="save-btn" onClick={handleAddNewPet}>Save Pet Profile</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Shield className="logo-icon" />
            <span>PawSense</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>Pet Profile</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Bell size={20} />
            <span>Health History</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="content-header">
          <div className="header-left">
            <h1>
              {activeTab === 'dashboard' && 'Health Dashboard'}
              {activeTab === 'profile' && 'Pet Profile'}
              {activeTab === 'history' && 'Health History'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p>Welcome back! Monitoring {currentPet?.name}'s health in real-time with PawSense</p>
          </div>
          
          <div className="header-right">
            <div className="pet-badge">
              <User size={20} />
              <span>{currentPet?.name}</span>
            </div>
            <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              {isConnected ? 'Live' : 'Offline'}
            </div>
          </div>
        </header>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            {isLoading && (
              <div className="loading-indicator">
                <div className="loading-spinner"></div>
                <span>Fetching sensor data...</span>
              </div>
            )}

            {(sensorData.heartRate === '--' || sensorData.heartRate === '0') && (
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <h4>Collar Not Properly Worn</h4>
                  <p>Please ensure the collar is properly attached to your pet or contact support personnel.</p>
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <Heart className="stat-icon" />
                  <span className="stat-title">Heart Rate</span>
                </div>
                <div className="stat-value">{sensorData.heartRate}</div>
                <div className="stat-unit">BPM</div>
                <div className={`status-badge ${getHeartStatus(sensorData.heartRate).status}`}>
                  {getHeartStatus(sensorData.heartRate).message}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <Thermometer className="stat-icon" />
                  <span className="stat-title">Temperature</span>
                </div>
                <div className="stat-value">{sensorData.temperature}</div>
                <div className="stat-unit">°C</div>
                <div className={`status-badge ${getTempStatus(sensorData.temperature).status}`}>
                  {getTempStatus(sensorData.temperature).message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Profile Tab */}
        {activeTab === 'profile' && currentPet && (
          <div className="profile-content">
            <div className="profile-header-card">
              <div className="avatar">
                <User size={60} />
              </div>
              <div className="profile-basic-info">
                <h2>{currentPet.name}</h2>
                <p className="breed">{currentPet.breed}</p>
                <div className="quick-stats">
                  <span>Age: {currentPet.age}</span>
                  <span>Weight: {currentPet.weight}</span>
                  <span>Owner: {currentPet.owner}</span>
                </div>
              </div>
            </div>

            <div className="profile-details-grid">
              {/* Favorite Things */}
              <div className="detail-card">
                <h3>❤️ Favorite Things</h3>
                <div className="tag-list">
                  {currentPet.favoriteThings.map((thing, index) => (
                    <span key={index} className="tag">{thing}</span>
                  ))}
                </div>
              </div>

              {/* Food Preferences */}
              <div className="detail-card">
                <h3>🍖 Food Preferences</h3>
                <div className="food-info">
                  <div className="food-type">
                    <strong>Diet Type:</strong> 
                    <span className={`diet-badge ${currentPet.foodPreferences.type}`}>
                      {currentPet.foodPreferences.type === 'veg' ? 'Vegetarian' : 
                       currentPet.foodPreferences.type === 'non-veg' ? 'Non-Vegetarian' : 'Mixed'}
                    </span>
                  </div>
                  
                  <div className="food-lists">
                    <div className="food-list">
                      <strong>Favorite Foods:</strong>
                      <div className="tag-list">
                        {currentPet.foodPreferences.favoriteFoods.map((food, index) => (
                          <span key={index} className="tag positive">{food}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="food-list">
                      <strong>Unsuitable Foods:</strong>
                      <div className="tag-list">
                        {currentPet.foodPreferences.unsuitableFoods.map((food, index) => (
                          <span key={index} className="tag negative">{food}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="feeding-schedule">
                    <strong>Feeding Schedule:</strong>
                    <p>{currentPet.foodPreferences.feedingSchedule}</p>
                  </div>
                </div>
              </div>

              {/* Health Guidelines */}
              <div className="detail-card">
                <h3>🏥 Health Guidelines</h3>
                <div className="health-grid">
                  <div className="health-item">
                    <strong>Ideal Temperature:</strong>
                    <span>{currentPet.healthGuidelines.suitableTemperature}</span>
                  </div>
                  <div className="health-item">
                    <strong>Exercise Needs:</strong>
                    <span>{currentPet.healthGuidelines.exerciseNeeds}</span>
                  </div>
                  <div className="health-item">
                    <strong>Grooming Needs:</strong>
                    <span>{currentPet.healthGuidelines.groomingNeeds}</span>
                  </div>
                  <div className="health-item full-width">
                    <strong>Special Care:</strong>
                    <div className="tag-list">
                      {currentPet.healthGuidelines.specialCare.map((care, index) => (
                        <span key={index} className="tag info">{care}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div className="detail-card">
                <h3>💊 Medical History</h3>
                <div className="medical-grid">
                  <div className="medical-section">
                    <strong>Vaccinations:</strong>
                    <div className="tag-list">
                      {currentPet.medicalHistory.vaccinations.map((vaccine, index) => (
                        <span key={index} className="tag success">{vaccine}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="medical-section">
                    <strong>Allergies:</strong>
                    <div className="tag-list">
                      {currentPet.medicalHistory.allergies.map((allergy, index) => (
                        <span key={index} className="tag warning">{allergy}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="medical-section">
                    <strong>Medications:</strong>
                    <div className="tag-list">
                      {currentPet.medicalHistory.medications.map((med, index) => (
                        <span key={index} className="tag info">{med}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="detail-card">
                <h3>📋 Basic Information</h3>
                <div className="basic-info-grid">
                  <div className="info-item">
                    <strong>Last Checkup:</strong>
                    <span>{currentPet.lastCheckup}</span>
                  </div>
                  <div className="info-item">
                    <strong>RFID Tag:</strong>
                    <span>{sensorData.rfid}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-content">
            <div className="history-card">
              <h3>Recent Health Readings</h3>
              <div className="history-list">
                {healthHistory.map((record, index) => (
                  <div key={index} className="history-item">
                    <div className="time">{record.time}</div>
                    <div className="readings">
                      <span>HR: {record.heartRate} BPM</span>
                      <span>Temp: {record.temperature}°C</span>
                    </div>
                    <div className={`status ${record.status}`}>
                      {record.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-content">
            <div className="settings-card">
              <h3>Device Settings</h3>
              <div className="setting-item">
                <label>ESP32 IP Address</label>
                <input 
                  type="text" 
                  value={esp32IP}
                  onChange={(e) => setEsp32IP(e.target.value)}
                  className="setting-input"
                />
              </div>
              <div className="setting-item">
                <label>Update Interval</label>
                <select className="setting-input">
                  <option>3 seconds</option>
                  <option>5 seconds</option>
                  <option>10 seconds</option>
                </select>
              </div>
              <button className="action-btn primary">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;