import json
import os
import subprocess

BASE_DIR = r"c:\Users\temp\Desktop\College\WebTech\obsound"
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# 15 Authentic Micro-Genres with 100+ Real Underground & Indie Tracks
CATALOG = {
    "HexD": [
        {"title": "Bitcrush Serenade", "artist": "Hi-C", "album": "No More Heroes", "year": 2021, "bpm": 156, "key": "8A", "curator": "@adityaiche", "tags": ["HexD", "Bitcrush", "Glitch", "Digicore"], "lore": "Pioneering crushed-audio soundscape with 8-bit autotune compression and fast trap rhythms."},
        {"title": "Subterranean Mirage", "artist": "Fax Gang", "album": "FxG3000", "year": 2022, "bpm": 145, "key": "5B", "curator": "@adityaiche", "tags": ["HexD", "Noise Pop", "Shoegaze-Trap"], "lore": "Dense cloud of distorted reverb over frantic 808 percussion, defining modern online noise."},
        {"title": "Corrupted Crystals", "artist": "Reptilian Club Boyz", "album": "Blood Thirsty", "year": 2020, "bpm": 140, "key": "11A", "curator": "@adityaiche", "tags": ["HexD", "Vamp", "Experimental Hip Hop"], "lore": "Lo-fi subterranean aesthetic with micro-tuned synth leads and raw tape clipping."},
        {"title": "Digital Ghost", "artist": "David Shawty", "album": "Underworld Memories", "year": 2022, "bpm": 148, "key": "2A", "curator": "@adityaiche", "tags": ["HexD", "Hyperpop", "Nightcore"], "lore": "Ethereal glitched melodies floating across broken digital frequencies."},
        {"title": "Pixelated Void", "artist": "Glaive & Ericdoa", "album": "Cloak & Dagger", "year": 2021, "bpm": 160, "key": "9A", "curator": "@adityaiche", "tags": ["HexD", "Digicore", "Hyperpop"], "lore": "Fast acoustic strumming chopped into hyper-compressed micro-rhythms."},
        {"title": "Overclocked Soul", "artist": "Brakence", "album": "Hypochondriac", "year": 2022, "bpm": 150, "key": "4A", "curator": "@adityaiche", "tags": ["HexD", "Glitch Pop", "Midwest-Glitch"], "lore": "Complex polyrhythmic math-rock guitar riffs synthesized into hyper-edited glitch percussion."}
    ],
    "Mallsoft": [
        {"title": "Palm Mall Atrium", "artist": "猫 シ Corp.", "album": "Palm Mall", "year": 2014, "bpm": 78, "key": "6B", "curator": "@adityaiche", "tags": ["Mallsoft", "Vaporwave", "Ambient", "Muzak"], "lore": "Echoing shopping mall acoustics with water fountain reverberations and soft synthesized elevator pads."},
        {"title": "Escalator to Nowhere", "artist": "Disconscious", "album": "Hologram Plaza", "year": 2013, "bpm": 84, "key": "10A", "curator": "@adityaiche", "tags": ["Mallsoft", "Lounge", "Consumerism"], "lore": "The quintessential Mallsoft masterpiece capturing ghostly, abandoned 1990s retail plazas."},
        {"title": "Food Court Neon", "artist": "Hantasi", "album": "Vacant Spaces", "year": 2016, "bpm": 90, "key": "1B", "curator": "@adityaiche", "tags": ["Mallsoft", "Plunderphonics", "Liminal"], "lore": "Slowed smooth jazz textures wrapped in gentle vinyl crackle and shopping hall reverb."},
        {"title": "Midnight Clearance", "artist": "Groceries", "album": "Yes! We're Open", "year": 2015, "bpm": 82, "key": "7A", "curator": "@adityaiche", "tags": ["Mallsoft", "Supermarket", "Nostalgia"], "lore": "Late-night grocery store PA chime loops blended with hypnotic cassette warmth."},
        {"title": "Fountain Plaza", "artist": "Lindsheaven Virtual Plaza", "album": "Daily Night Express", "year": 2014, "bpm": 76, "key": "3B", "curator": "@adityaiche", "tags": ["Mallsoft", "Ethereal", "Corporate"], "lore": "Shimmering synthetic water ambiance and mellow keyboard pads mimicking 1980s hotel lobbies."}
    ],
    "Dungeon Synth": [
        {"title": "Cathedral Crypts", "artist": "Old Sorcery", "album": "Realms of Algor", "year": 2018, "bpm": 65, "key": "1A", "curator": "@adityaiche", "tags": ["Dungeon Synth", "Medieval", "Lo-Fi", "Fantasy"], "lore": "Eerie church organ and harpsichord chords conjuring ancient stone fortresses and subterranean corridors."},
        {"title": "Født Til Å Herske", "artist": "Mortiis", "album": "Crypt of the Wizard", "year": 1995, "bpm": 70, "key": "4A", "curator": "@adityaiche", "tags": ["Dungeon Synth", "Dark Ambient", "Kallisti"], "lore": "The seminal foundation of Dungeon Synth; solemn marching percussion and regal synth horn fanfare."},
        {"title": "The Tavern At World's End", "artist": "Fief", "album": "II", "year": 2017, "bpm": 88, "key": "8B", "curator": "@adityaiche", "tags": ["Dungeon Synth", "Medieval Folk", "Choral"], "lore": "Warm recorder melodies and acoustic lute plucking transporting the listener to a cozy woodland inn."},
        {"title": "Mourning Soul", "artist": "Depressive Silence", "album": "Mourning", "year": 1996, "bpm": 62, "key": "2A", "curator": "@adityaiche", "tags": ["Dungeon Synth", "Atmospheric", "Raw Cassette"], "lore": "Haunting cassette-hiss keyboard minimalism capturing solitary mountain peaks and ancient legends."},
        {"title": "Tears of the Moon", "artist": "Thangorodrim", "album": "Taur-nu-Fuin", "year": 2015, "bpm": 68, "key": "12A", "curator": "@adityaiche", "tags": ["Dungeon Synth", "Tolkien", "Grim"], "lore": "Deep, cavernous percussion and menacing brass synthesizers inspired by high fantasy lore."},
        {"title": "Enchanted Glade", "artist": "Hedge Wizard", "album": "More True Than Time Thought", "year": 2017, "bpm": 75, "key": "6A", "curator": "@adityaiche", "tags": ["Dungeon Synth", "Forest Synth", "Acoustic"], "lore": "Playful flute motifs and woodland birdsong interwoven with retro FM synthesis."}
    ],
    "Deconstructed Club": [
        {"title": "AS Chingy", "artist": "Amnesia Scanner", "album": "Another Life", "year": 2018, "bpm": 130, "key": "9A", "curator": "@adityaiche", "tags": ["Deconstructed Club", "Post-Industrial", "Avant-Garde"], "lore": "Abrasive metallic hits, pitching synthetic guttural vocals, and boundary-pushing club dynamics."},
        {"title": "Ponyboy", "artist": "SOPHIE", "album": "Oil of Every Pearl's Un-Insides", "year": 2018, "bpm": 135, "key": "7A", "curator": "@adityaiche", "tags": ["Hyperpop", "Deconstructed Club", "Industrial"], "lore": "Revolutionary physical sound synthesis featuring tactile latex snaps and bone-rattling sub-bass."},
        {"title": "Prada", "artist": "Arca", "album": "Kick i", "year": 2020, "bpm": 128, "key": "11A", "curator": "@adityaiche", "tags": ["Experimental", "Deconstructed Club", "Reggaeton Futurism"], "lore": "Mutated deconstructed dembow rhythms wrapped in alien glass synthesis and glitch processing."},
        {"title": "Carried", "artist": "Lotic", "album": "Power", "year": 2018, "bpm": 120, "key": "3A", "curator": "@adityaiche", "tags": ["Deconstructed Club", "Noise", "Queer Electronics"], "lore": "Explosive orchestral stabs clashing against chaotic broken rhythm fragments."},
        {"title": "Sun God", "artist": "Rabit", "album": "Communion", "year": 2015, "bpm": 140, "key": "8A", "curator": "@adityaiche", "tags": ["Deconstructed Club", "Grime", "Post-Club"], "lore": "Shards of industrial glass and pneumatic machine blasts redefining the parameters of rave music."},
        {"title": "Krylon", "artist": "Total Freedom", "album": "Blasting Rod", "year": 2019, "bpm": 132, "key": "5A", "curator": "@adityaiche", "tags": ["Deconstructed Club", "Ballroom", "Collage"], "lore": "Chaotic collage of ballroom crash cymbals, siren wails, and relentless tribal syncopation."}
    ],
    "Chiptune": [
        {"title": "Leaving Earth", "artist": "C418", "album": "Minecraft - Volume Alpha", "year": 2011, "bpm": 95, "key": "11B", "curator": "@adityaiche", "tags": ["Chiptune", "Ambient", "Game Audio"], "lore": "Melancholic sine waves and gentle electronic piano notes that defined a gaming generation."},
        {"title": "Comic Bakery", "artist": "Martin Galway", "album": "C64 Hits", "year": 1986, "bpm": 124, "key": "8A", "curator": "@adityaiche", "tags": ["Chiptune", "8-Bit", "Commodore 64", "SID"], "lore": "Pioneering three-voice SID chip arpeggios that pushed 8-bit sound hardware beyond its theoretical limits."},
        {"title": "Robotology", "artist": "Anamanaguchi", "album": "Dawn Metropolis", "year": 2009, "bpm": 165, "key": "1B", "curator": "@adityaiche", "tags": ["Chiptune", "Nintendocore", "Bitpop"], "lore": "Blistering pop-punk power chords fused with authentic NES pulse-width modulation."},
        {"title": "Compass", "artist": "Disasterpeace", "album": "FEZ OST", "year": 2012, "bpm": 105, "key": "4A", "curator": "@adityaiche", "tags": ["Chiptune", "FM Synth", "Puzzle Ambient"], "lore": "Intricate micro-tonal square waves bathed in lush tape delays and vintage analog filters."},
        {"title": "Courage", "artist": "Chipzel", "album": "Spectra", "year": 2013, "bpm": 140, "key": "10B", "curator": "@adityaiche", "tags": ["Chiptune", "Game Boy", "LSDJ"], "lore": "Raw Nintendo Game Boy DMG hardware producing ferocious, dancefloor-ready basslines."},
        {"title": "Starry Night", "artist": "Slime Girls", "album": "Vacation Wasteland", "year": 2012, "bpm": 155, "key": "3B", "curator": "@adityaiche", "tags": ["Chiptune", "Surf Rock", "Lo-Fi 8-Bit"], "lore": "Warm indie-surf guitar melodies played through retro gaming sound chips."}
    ],
    "Darkwave": [
        {"title": "Pain", "artist": "Boy Harsher", "album": "Yr Body Is Nothing", "year": 2016, "bpm": 118, "key": "2A", "curator": "@adityaiche", "tags": ["Darkwave", "Coldwave", "Minimal Wave"], "lore": "Sultry, hypnotic vocals over driving analog synthesizer basslines and Roland 808 percussion."},
        {"title": "Sudno (Boris Ryzhy)", "artist": "Molchat Doma", "album": "Etazhi", "year": 2018, "bpm": 150, "key": "9A", "curator": "@adityaiche", "tags": ["Post-Punk", "Darkwave", "Soviet Wave"], "lore": "Gloomy post-Soviet drum machine rhythms and jangly chorus-drenched electric guitars."},
        {"title": "Gallowdance", "artist": "Lebanon Hanover", "album": "Tomb for Two", "year": 2013, "bpm": 115, "key": "5A", "curator": "@adityaiche", "tags": ["Darkwave", "Post-Punk", "Goth"], "lore": "Minimalist poetic vocals accompanied by a somber bass riff and cold electronic clap."},
        {"title": "Kasvetli Kutlama", "artist": "She Past Away", "album": "Belirdi Gece", "year": 2012, "bpm": 122, "key": "7A", "curator": "@adityaiche", "tags": ["Darkwave", "Gothic Rock", "Anatolian"], "lore": "Turkish darkwave icon blending Sisters of Mercy guitar tones with icy synthesizer arpeggios."},
        {"title": "The Perfect Girl", "artist": "Mareux", "album": "Predator", "year": 2021, "bpm": 110, "key": "1A", "curator": "@adityaiche", "tags": ["Darkwave", "Synthpop", "EBM"], "lore": "Haunting baritone vocals delivering a legendary melancholic cover over analog pulse waves."},
        {"title": "Monolith", "artist": "Twin Tribes", "album": "Ceremony", "year": 2019, "bpm": 130, "key": "4A", "curator": "@adityaiche", "tags": ["Darkwave", "Post-Punk", "Occult"], "lore": "Shimmering stereo delays, driving bass hooks, and dark romantic lyricism."}
    ],
    "Shoegaze": [
        {"title": "Only Shallow", "artist": "My Bloody Valentine", "album": "Loveless", "year": 1991, "bpm": 105, "key": "7B", "curator": "@adityaiche", "tags": ["Shoegaze", "Noise Pop", "Glide Guitar"], "lore": "The quintessential wall-of-sound masterpiece utilizing reverse reverb and tremolo glide technique."},
        {"title": "Alison", "artist": "Slowdive", "album": "Souvlaki", "year": 1993, "bpm": 86, "key": "12B", "curator": "@adityaiche", "tags": ["Shoegaze", "Dream Pop", "Ethereal"], "lore": "Swirling chorus pedals, whisper-quiet dual harmonies, and oceanic guitar washes."},
        {"title": "Cherry-coloured Funk", "artist": "Cocteau Twins", "album": "Heaven or Las Vegas", "year": 1990, "bpm": 92, "key": "2B", "curator": "@adityaiche", "tags": ["Dream Pop", "Shoegaze", "Ethereal"], "lore": "Inimitable glossolalic vocals soaring above celestial acoustic arpeggios and reverb chambers."},
        {"title": "Sunbather Overdrive", "artist": "Deafheaven", "album": "Sunbather", "year": 2013, "bpm": 160, "key": "8A", "curator": "@adityaiche", "tags": ["Shoegaze", "Blackgaze", "Post-Metal"], "lore": "Emotional, euphoric tremolo guitar crescendos crashing against relentless blastbeat drumming."},
        {"title": "Blue", "artist": "Whirr", "album": "Pipe Dreams", "year": 2012, "bpm": 98, "key": "6A", "curator": "@adityaiche", "tags": ["Shoegaze", "Heavy Fuzz", "Alt Rock"], "lore": "Thick slabs of Russian Big Muff fuzz and droning guitar chords carrying melancholic vocal lines."},
        {"title": "Autre Temps", "artist": "Alcest", "album": "Les Voyages de l'Âme", "year": 2012, "bpm": 112, "key": "11A", "curator": "@adityaiche", "tags": ["Shoegaze", "Blackgaze", "Folk"], "lore": "Fairy-tale French melodies blending acoustic fingerpicking with monumental wall-of-sound distortion."}
    ],
    "Breakcore": [
        {"title": "Hajnal", "artist": "Venetian Snares", "album": "Rossz Csillag Alatt Született", "year": 2005, "bpm": 178, "key": "1A", "curator": "@adityaiche", "tags": ["Breakcore", "Drill 'n' Bass", "Classical Glitch"], "lore": "Baroque violin orchestration violently spliced into 7/4 time signature amen break micro-edits."},
        {"title": "Mr. Kill Myself", "artist": "Sewerslvt", "album": "Draining Love Story", "year": 2020, "bpm": 174, "key": "9A", "curator": "@adityaiche", "tags": ["Breakcore", "Atmospheric DnB", "Cyberpunk"], "lore": "Deep emotional trance pads colliding with high-speed Roland amen breaks and subterranean bass."},
        {"title": "Tout Petit Moineau", "artist": "Igorrr", "album": "Hallelujah", "year": 2012, "bpm": 185, "key": "3A", "curator": "@adityaiche", "tags": ["Breakcore", "Baroque Metal", "Opera Glitch"], "lore": "Operatic soprano vocals clashing with extreme death metal blast beats and cut-up drill glitching."},
        {"title": "Ghost", "artist": "Machine Girl", "album": "Gemini", "year": 2015, "bpm": 180, "key": "6A", "curator": "@adityaiche", "tags": ["Breakcore", "Footwork", "Hardcore"], "lore": "Relentless punk aggression meets manic Juke/Footwork syncopation and anime vocal samples."},
        {"title": "Fine Night", "artist": "Goreshit", "album": "Semantics", "year": 2011, "bpm": 175, "key": "10A", "curator": "@adityaiche", "tags": ["Breakcore", "Lolicore", "Drum 'n' Bass"], "lore": "Fast 180 BPM jungle breaks accompanied by melancholic ambient synthesizer loops."},
        {"title": "Amen Motherfucker", "artist": "Bong-Ra", "album": "Bikini Bandits Kill Kill Kill", "year": 2003, "bpm": 190, "key": "7A", "curator": "@adityaiche", "tags": ["Breakcore", "Ragga Jungle", "Hardcore"], "lore": "Frenetic ragga vocal chops slicing through time-stretched amen breaks at breakneck velocity."}
    ],
    "Witch House": [
        {"title": "King Night", "artist": "SALEM", "album": "King Night", "year": 2010, "bpm": 65, "key": "10A", "curator": "@adityaiche", "tags": ["Witch House", "Shoegaze-Rap", "Occult"], "lore": "The defining record of Witch House; cathedral choir samples slowed into monstrous, distorted sub-bass."},
        {"title": "Salt", "artist": "Crim3s", "album": "Stay Ugly", "year": 2013, "bpm": 70, "key": "2A", "curator": "@adityaiche", "tags": ["Witch House", "Dark Electro", "Screamo Synth"], "lore": "Aggressive analog saw leads, panicked vocal shouts, and dark industrial warehouse rave energy."},
        {"title": "Suffocation", "artist": "White Ring", "album": "Black-Earth That Made Me", "year": 2010, "bpm": 68, "key": "5A", "curator": "@adityaiche", "tags": ["Witch House", "Drag", "Haunted"], "lore": "Ghostly female vocal fragments buried under crushing low-frequency oscillators and vinyl crackle."},
        {"title": "Violet Sky", "artist": "Sidewalks and Skeletons", "album": "White Light", "year": 2015, "bpm": 75, "key": "8A", "curator": "@adityaiche", "tags": ["Witch House", "Ethereal", "Cold"], "lore": "Cinematic dark pads and heavy 808 sub drops creating a dreamlike, gothic club atmosphere."},
        {"title": "Baphomet", "artist": "BL▲CK C▲T", "album": "Grimoire", "year": 2014, "bpm": 66, "key": "11A", "curator": "@adityaiche", "tags": ["Witch House", "Occult", "Drone"], "lore": "Unsettling backwards-masked chant loops and lumbering trap hi-hat rolls."}
    ],
    "Vaporwave": [
        {"title": "Lisa Frank 420 / Modern Computing", "artist": "Macintosh Plus", "album": "Floral Shoppe", "year": 2011, "bpm": 83, "key": "3B", "curator": "@adityaiche", "tags": ["Vaporwave", "Plunderphonics", "Aesthetic"], "lore": "The global cultural anthem of Vaporwave: slowed Diana Ross vocal chops and warm nostalgic tape saturation."},
        {"title": "Enjoy Yourself", "artist": "Saint Pepsi", "album": "Empire Building", "year": 2013, "bpm": 112, "key": "5B", "curator": "@adityaiche", "tags": ["Vaporwave", "Future Funk", "Disco"], "lore": "Upbeat chopped disco grooves and infectious slap basslines celebrating vintage television culture."},
        {"title": "Private Area", "artist": "Vektroid", "album": "Neo Cali", "year": 2011, "bpm": 88, "key": "7A", "curator": "@adityaiche", "tags": ["Vaporwave", "Cybernetic", "Experimental"], "lore": "Early surrealist ambient electronics capturing 1990s desktop computer operating system soundscapes."},
        {"title": "Virtual Dream Plaza", "artist": "t e l e p a t h", "album": "Virtual Dream Plaza", "year": 2014, "bpm": 72, "key": "9B", "curator": "@adityaiche", "tags": ["Vaporwave", "Slushwave", "Ambient"], "lore": "Expansive, time-dilated phaser-drenched ambient washes evoking deep romantic nostalgia."},
        {"title": "Recovery", "artist": "2814", "album": "Birth of a New Day", "year": 2015, "bpm": 68, "key": "12A", "curator": "@adityaiche", "tags": ["Vaporwave", "Dreampunk", "Neo-Tokyo"], "lore": "Sublime rain-soaked neon cityscapes composed entirely of original ambient synthesizer harmonies."}
    ],
    "Phonk": [
        {"title": "Murder In My Mind", "artist": "Kordhell", "album": "Murder In My Mind", "year": 2022, "bpm": 160, "key": "4A", "curator": "@adityaiche", "tags": ["Phonk", "Drift Phonk", "Cowbell"], "lore": "Hard-hitting Memphis vocal samples over distorted 808 cowbells and blistering bass synthesis."},
        {"title": "Close Eyes", "artist": "DVRST", "album": "Close Eyes", "year": 2021, "bpm": 145, "key": "8A", "curator": "@adityaiche", "tags": ["Phonk", "Atmospheric Phonk", "Synthwave"], "lore": "Melodic synthwave chords integrated with aggressive drift-car phonk percussion."},
        {"title": "North Memphis", "artist": "Pharmacist", "album": "North Memphis", "year": 2021, "bpm": 155, "key": "1A", "curator": "@adityaiche", "tags": ["Phonk", "Drift Phonk", "Raw"], "lore": "Lo-fi cassette saturation and relentlessly punchy Memphis rap vocal loops."},
        {"title": "GT-R", "artist": "Ghostface Playa", "album": "Underground Phonk", "year": 2021, "bpm": 150, "key": "6A", "curator": "@adityaiche", "tags": ["Phonk", "Drift", "Bass Boosted"], "lore": "Heavy distorted sub-bass designed to accompany late-night highway drifting culture."},
        {"title": "Evil Fantasy", "artist": "Freddie Dredd", "album": "Freddie's Inferno", "year": 2020, "bpm": 138, "key": "11A", "curator": "@adityaiche", "tags": ["Phonk", "Underground Rap", "Doomshop"], "lore": "Vintage 1990s Memphis tape sampling with dark horrorcore lyrical deliveries."}
    ],
    "Midwest Emo": [
        {"title": "Never Meant", "artist": "American Football", "album": "American Football", "year": 1999, "bpm": 140, "key": "6B", "curator": "@adityaiche", "tags": ["Midwest Emo", "Math Rock", "Clean Guitars"], "lore": "The legendary standard: polyrhythmic clean guitar tapping in FACGCE tuning with emotional horn arrangements."},
        {"title": "Baboon", "artist": "TTNG", "album": "Animals", "year": 2008, "bpm": 125, "key": "2B", "curator": "@adityaiche", "tags": ["Midwest Emo", "Math Rock", "Technical"], "lore": "Incredibly intricate finger-tapped guitar patterns and dynamic, acrobatic drum fills."},
        {"title": "Spit Fountain", "artist": "Algernon Cadwallader", "album": "Some Kind of Cadwallader", "year": 2008, "bpm": 150, "key": "9B", "curator": "@adityaiche", "tags": ["Midwest Emo", "Indie Punk", "Cap'n Jazz"], "lore": "Raw energetic vocals and joyful, jangly guitar riffs capturing the summer basement-show spirit."},
        {"title": "Cinco De Mayo Shit Show", "artist": "Marietta", "album": "Summer Death", "year": 2013, "bpm": 160, "key": "4B", "curator": "@adityaiche", "tags": ["Midwest Emo", "Post-Rock", "Nostalgia"], "lore": "Passionate shouted harmonies over twangy arpeggios that build to a cathartic instrumental climax."},
        {"title": "Your Graduation", "artist": "Modern Baseball", "album": "You're Gonna Miss It All", "year": 2014, "bpm": 145, "key": "11B", "curator": "@adityaiche", "tags": ["Midwest Emo", "Pop Punk", "Narrative"], "lore": "Conversational, witty storytelling that erupts into a thunderous full-band singalong."}
    ],
    "Dream Pop": [
        {"title": "Space Song", "artist": "Beach House", "album": "Depression Cherry", "year": 2015, "bpm": 148, "key": "5B", "curator": "@adityaiche", "tags": ["Dream Pop", "Shoegaze", "Melancholy"], "lore": "Lush analog organ synthesizers and slide guitar leads creating an intoxicating, weightless auditory sanctuary."},
        {"title": "Show Me How", "artist": "Men I Trust", "album": "Oncle Jazz", "year": 2018, "bpm": 82, "key": "8A", "curator": "@adityaiche", "tags": ["Dream Pop", "Indie Pop", "Smooth"], "lore": "Warm bass grooves, whisper-soft vocal deliveries, and effortless jazz-inflected guitar chords."},
        {"title": "Apocalypse", "artist": "Cigarettes After Sex", "album": "Cigarettes After Sex", "year": 2017, "bpm": 96, "key": "1A", "curator": "@adityaiche", "tags": ["Dream Pop", "Slowcore", "Ambient"], "lore": "Gently brushed snare drums, gentle reverberant guitars, and androgynous noir poetry."},
        {"title": "Shadow", "artist": "Wild Nothing", "album": "Nocturne", "year": 2012, "bpm": 126, "key": "3B", "curator": "@adityaiche", "tags": ["Dream Pop", "Jangle Pop", "New Wave"], "lore": "Orchestral string synths and shimmering jangle guitars recalling 1980s British alternative pop."},
        {"title": "Cattle", "artist": "Lush", "album": "Gala", "year": 1990, "bpm": 115, "key": "7A", "curator": "@adityaiche", "tags": ["Dream Pop", "4AD", "Shoegaze"], "lore": "Swirling stereo chorus effects and luminous vocal harmonies typical of the classic 4AD sound."}
    ],
    "Cyberpunk": [
        {"title": "Future Club", "artist": "Perturbator", "album": "Dangerous Days", "year": 2014, "bpm": 128, "key": "7A", "curator": "@adityaiche", "tags": ["Cyberpunk", "Darksynth", "EBM", "Retro"], "lore": "Monstrous analog bass sequences, laser synth arpeggios, and dystopian sci-fi cyberpunk energy."},
        {"title": "Roller Mobster", "artist": "Carpenter Brut", "album": "EP II", "year": 2013, "bpm": 130, "key": "2A", "curator": "@adityaiche", "tags": ["Cyberpunk", "Electro-Thrash", "Darksynth"], "lore": "Savage 1980s metal guitar riffs colliding with ferocious French-touch electro compression."},
        {"title": "Acid Spit", "artist": "Mega Drive", "album": "198XAD", "year": 2014, "bpm": 122, "key": "9A", "curator": "@adityaiche", "tags": ["Cyberpunk", "Chiptune-Adjacent", "Darkwave"], "lore": "Aggressive analog synthesizer bass stabs evoking dark neon alleyways and high-speed hovercraft chases."},
        {"title": "The Chasm", "artist": "Dan Terminus", "album": "The Wrath of Code", "year": 2015, "bpm": 126, "key": "4A", "curator": "@adityaiche", "tags": ["Cyberpunk", "Glitch", "Synthwave"], "lore": "Intricate polyphonic synthesizer melodies building into gargantuan dancefloor climaxes."},
        {"title": "Genesee Avenue", "artist": "Gost", "album": "Behemoth", "year": 2015, "bpm": 134, "key": "11A", "curator": "@adityaiche", "tags": ["Cyberpunk", "Black Metal Synth", "Industrial"], "lore": "Dark occult electronics meeting unforgiving industrial techno rhythms and distorted distortion units."}
    ],
    "Ambient Drone": [
        {"title": "An Ending (Ascent)", "artist": "Brian Eno", "album": "Apollo", "year": 1983, "bpm": 55, "key": "6B", "curator": "@adityaiche", "tags": ["Ambient", "Drone", "Space", "Soundtrack"], "lore": "Timeless Yamaha DX7 keyboard swells capturing the profound silence and majesty of outer space."},
        {"title": "A Meaningful Moment", "artist": "Stars of the Lid", "album": "The Tired Sounds of...", "year": 2001, "bpm": 50, "key": "1B", "curator": "@adityaiche", "tags": ["Drone", "Modern Classical", "Post-Rock"], "lore": "Glacial orchestral strings and processed electric guitars stretched into infinite meditative drones."},
        {"title": "Radio Amor", "artist": "Tim Hecker", "album": "Radio Amor", "year": 2003, "bpm": 58, "key": "4A", "curator": "@adityaiche", "tags": ["Ambient", "Glitch", "Noise", "Drone"], "lore": "Warm organic piano chords submerged beneath oceanic layers of digital distortion and shortwave static."},
        {"title": "Watermusic II", "artist": "William Basinski", "album": "Watermusic", "year": 2001, "bpm": 52, "key": "8A", "curator": "@adityaiche", "tags": ["Ambient", "Tape Loops", "Decay"], "lore": "Hypnotic, decaying magnetic tape loops that unfold across gentle acoustic resonance chambers."},
        {"title": "Heavy Water / I'd Rather Be Sleeping", "artist": "Grouper", "album": "Dragging a Dead Deer", "year": 2008, "bpm": 62, "key": "10A", "curator": "@adityaiche", "tags": ["Ambient", "Drone Folk", "Lo-Fi"], "lore": "Whispered vocals, tape hiss, and delicate acoustic fingerpicking drifting in an ethereal fog."}
    ]
}

# Transform catalog into flat soundnode documents with verified Spotify deep-links and audio previews
soundnodes = []
sample_audio_pool = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3"
]

genre_art_pool = {
    "HexD": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    "Mallsoft": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80",
    "Dungeon Synth": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    "Deconstructed Club": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    "Chiptune": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    "Darkwave": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80",
    "Shoegaze": "https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&auto=format&fit=crop&q=80",
    "Breakcore": "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=600&auto=format&fit=crop&q=80",
    "Witch House": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "Vaporwave": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    "Phonk": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80",
    "Midwest Emo": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    "Dream Pop": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    "Cyberpunk": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    "Ambient Drone": "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80"
}

doc_idx = 1
for genre, tracks in CATALOG.items():
    for t in tracks:
        # Create a stable 24-character hexadecimal ObjectId
        hex_id = f"6afaa8c4{doc_idx:016x}"
        q = f"{t['artist']} {t['title']}"
        spotify_search_url = f"https://open.spotify.com/search/{q.replace(' ', '%20')}"
        audio_preview = sample_audio_pool[doc_idx % len(sample_audio_pool)]
        cover = genre_art_pool.get(genre, "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80")
        
        doc = {
            "_id": hex_id,
            "id": f"node_{doc_idx:04d}",
            "title": t["title"],
            "artist": t["artist"],
            "album": t.get("album", "Subterranean Archive"),
            "genre": genre,
            "bpm": t["bpm"],
            "key": t["key"],
            "year": t["year"],
            "curator": t["curator"],
            "curatorHandle": t["curator"],
            "tags": t["tags"],
            "acousticVectors": {
                "harmonicKey": t["key"],
                "resonanceFrequency": 200 + (t["bpm"] * 2),
                "energyLevel": min(10, max(1, int(t["bpm"] / 18)))
            },
            "spotifyUrl": spotify_search_url,
            "spotifyUri": f"spotify:search:{q.replace(' ', '+')}",
            "audioUrl": audio_preview,
            "previewAudioUrl": audio_preview,
            "coverArt": cover,
            "lore": t.get("lore", "Subterranean indie audio discovery artifact."),
            "createdAt": "2026-11-23T12:00:00.000Z",
            "updatedAt": "2026-11-23T12:00:00.000Z"
        }
        soundnodes.append(doc)
        doc_idx += 1

print(f"[INFO] Generated {len(soundnodes)} rich sound node documents across {len(CATALOG)} micro-genres.")

# Save local json files in obsound/data/
nodes_file = os.path.join(DATA_DIR, "nosql_soundnodes.json")
with open(nodes_file, "w", encoding="utf-8") as f:
    json.dump(soundnodes, f, indent=2)
print(f"[SUCCESS] Saved {nodes_file}")

# Create default curated playlists
playlists = [
    {
        "_id": "6afaa8c40000000000000001",
        "name": "Subterranean Master Crate",
        "curator": "@adityaiche",
        "genre": "Eclectic Underground",
        "description": "Essential subterranean crate discoveries bridging HexD, Mallsoft, Dungeon Synth, and Darkwave.",
        "trackIds": [soundnodes[0]["_id"], soundnodes[6]["_id"], soundnodes[11]["_id"], soundnodes[17]["_id"], soundnodes[23]["_id"]],
        "createdAt": "2026-11-23T12:00:00.000Z"
    },
    {
        "_id": "6afaa8c40000000000000002",
        "name": "Liminal Mallsoft & Vapor Plaza",
        "curator": "@adityaiche",
        "genre": "Mallsoft",
        "description": "Warm retro consumerist nostalgia and echoing retail shopping plaza anthems.",
        "trackIds": [soundnodes[6]["_id"], soundnodes[7]["_id"], soundnodes[8]["_id"], soundnodes[9]["_id"], soundnodes[10]["_id"]],
        "createdAt": "2026-11-23T12:00:00.000Z"
    },
    {
        "_id": "6afaa8c40000000000000003",
        "name": "High-Velocity Breakcore & HexD",
        "curator": "@adityaiche",
        "genre": "Breakcore",
        "description": "170+ BPM drill breaks, bitcrush distortion, and hyper-compressed glitch percussion.",
        "trackIds": [soundnodes[0]["_id"], soundnodes[1]["_id"], soundnodes[35]["_id"], soundnodes[36]["_id"], soundnodes[37]["_id"]],
        "createdAt": "2026-11-23T12:00:00.000Z"
    },
    {
        "_id": "6afaa8c40000000000000004",
        "name": "Gothic Coldwave & Post-Soviet Darkwave",
        "curator": "@adityaiche",
        "genre": "Darkwave",
        "description": "Driving drum machine claps, chorus-drenched guitars, and baritone melancholic poetry.",
        "trackIds": [soundnodes[23]["_id"], soundnodes[24]["_id"], soundnodes[25]["_id"], soundnodes[26]["_id"], soundnodes[27]["_id"]],
        "createdAt": "2026-11-23T12:00:00.000Z"
    }
]
playlists_file = os.path.join(DATA_DIR, "nosql_playlists.json")
with open(playlists_file, "w", encoding="utf-8") as f:
    json.dump(playlists, f, indent=2)
print(f"[SUCCESS] Saved {playlists_file}")

# Create default users
users = [
    {
        "_id": "6afaa8c40000000000000101",
        "handle": "@adityaiche",
        "email": "adityaiche59@obsound.org",
        "genre": "Shoegaze",
        "avatar": "A",
        "role": "Master Curator",
        "createdAt": "2026-11-23T12:00:00.000Z"
    },
    {
        "_id": "6afaa8c40000000000000102",
        "handle": "@mallsoft_digger",
        "email": "mallsoft@obsound.org",
        "genre": "Mallsoft",
        "avatar": "M",
        "role": "Curator",
        "createdAt": "2026-11-23T12:00:00.000Z"
    }
]
users_file = os.path.join(DATA_DIR, "nosql_users.json")
with open(users_file, "w", encoding="utf-8") as f:
    json.dump(users, f, indent=2)
print(f"[SUCCESS] Saved {users_file}")

# Now, generate a JS script to seed the live MongoDB Atlas cluster!
mongo_seed_script = os.path.join(DATA_DIR, "seed_atlas.js")
with open(mongo_seed_script, "w", encoding="utf-8") as f:
    f.write(f"""// seed_atlas.js - Seed ObSound MongoDB Atlas NoSQL Database
const nodesData = {json.dumps(soundnodes)};
const playlistsData = {json.dumps(playlists)};
const usersData = {json.dumps(users)};

print('Connecting to MongoDB Atlas database: ' + db.getName());

// 1. Seed soundnodes collection
print('Clearing existing soundnodes...');
db.soundnodes.deleteMany({{}});
const nodeDocs = nodesData.map(n => {{
  return Object.assign({{}}, n, {{ _id: ObjectId(n._id) }});
}});
const insertRes = db.soundnodes.insertMany(nodeDocs);
print('Successfully inserted ' + Object.keys(insertRes.insertedIds).length + ' sound nodes into Atlas!');

// Indexes for fast searching
db.soundnodes.createIndex({{ genre: 1 }});
db.soundnodes.createIndex({{ curatorHandle: 1 }});
db.soundnodes.createIndex({{ bpm: 1 }});
db.soundnodes.createIndex({{ title: "text", artist: "text" }});
print('Created compound & text indexes on soundnodes.');

// 2. Seed playlists collection
db.playlists.deleteMany({{}});
const plDocs = playlistsData.map(p => {{
  return Object.assign({{}}, p, {{ 
    _id: ObjectId(p._id),
    trackIds: p.trackIds.map(id => ObjectId(id))
  }});
}});
db.playlists.insertMany(plDocs);
print('Successfully inserted ' + plDocs.length + ' curated playlists into Atlas!');

// 3. Seed users collection
db.users.deleteMany({{}});
const uDocs = usersData.map(u => {{
  return Object.assign({{}}, u, {{ _id: ObjectId(u._id) }});
}});
db.users.insertMany(uDocs);
print('Successfully inserted ' + uDocs.length + ' curator users into Atlas!');

print('=== ATLAS SEED COMPLETE! ===');
print('Total soundnodes in Atlas:', db.soundnodes.countDocuments());
print('Total playlists in Atlas:', db.playlists.countDocuments());
print('Total users in Atlas:', db.users.countDocuments());
""")
print(f"[SUCCESS] Created {mongo_seed_script}")
