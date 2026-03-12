const SCRIPTURE_MATCHES = [
  // Genesis
  { text: "In the beginning God created the heaven and the earth", ref: "Genesis 1:1", fullText: "In the beginning God created the heaven and the earth." },
  { text: "And God said, Let there be light", ref: "Genesis 1:3", fullText: "And God said, Let there be light: and there was light." },
  { text: "It is not good that the man should be alone", ref: "Genesis 2:18", fullText: "And the LORD God said, It is not good that the man should be alone; I will make him an help meet for him." },
  { text: "I will make of thee a great nation", ref: "Genesis 12:2", fullText: "And I will make of thee a great nation, and I will bless thee, and make thy name great; and thou shalt be a blessing." },
  { text: "Is any thing too hard for the LORD?", ref: "Genesis 18:14", fullText: "Is any thing too hard for the LORD? At the time appointed I will return unto thee, according to the time of life, and Sarah shall have a son." },
  { text: "Ye thought evil against me; but God meant it unto good", ref: "Genesis 50:20", fullText: "But as for you, ye thought evil against me; but God meant it unto good, to bring to pass, as it is this day, to save much people alive." },

  // Exodus - Ten Commandments and key verses
  { text: "Thou shalt have no other gods before me", ref: "Exodus 20:3", fullText: "Thou shalt have no other gods before me." },
  { text: "Thou shalt not make unto thee any graven image", ref: "Exodus 20:4", fullText: "Thou shalt not make unto thee any graven image, or any likeness of any thing that is in heaven above, or that is in the earth beneath, or that is in the water under the earth." },
  { text: "Thou shalt not take the name of the LORD thy God in vain", ref: "Exodus 20:7", fullText: "Thou shalt not take the name of the LORD thy God in vain; for the LORD will not hold him guiltless that taketh his name in vain." },
  { text: "Remember the sabbath day, to keep it holy", ref: "Exodus 20:8", fullText: "Remember the sabbath day, to keep it holy." },
  { text: "Honour thy father and thy mother", ref: "Exodus 20:12", fullText: "Honour thy father and thy mother: that thy days may be long upon the land which the LORD thy God giveth thee." },
  { text: "Thou shalt not kill", ref: "Exodus 20:13", fullText: "Thou shalt not kill." },
  { text: "Thou shalt not commit adultery", ref: "Exodus 20:14", fullText: "Thou shalt not commit adultery." },
  { text: "Thou shalt not steal", ref: "Exodus 20:15", fullText: "Thou shalt not steal." },
  { text: "Thou shalt not bear false witness", ref: "Exodus 20:16", fullText: "Thou shalt not bear false witness against thy neighbour." },
  { text: "Thou shalt not covet", ref: "Exodus 20:17", fullText: "Thou shalt not covet thy neighbour's house, thou shalt not covet thy neighbour's wife, nor his manservant, nor his maidservant, nor his ox, nor his ass, nor any thing that is thy neighbour's." },

  // Leviticus
  { text: "Thou shalt love thy neighbour as thyself", ref: "Leviticus 19:18", fullText: "Thou shalt not avenge, nor bear any grudge against the children of thy people, but thou shalt love thy neighbour as thyself: I am the LORD." },
  { text: "Be ye holy; for I am holy", ref: "Leviticus 11:44", fullText: "For I am the LORD your God: ye shall therefore sanctify yourselves, and ye shall be holy; for I am holy." },

  // Deuteronomy
  { text: "Hear, O Israel: The LORD our God is one LORD", ref: "Deuteronomy 6:4", fullText: "Hear, O Israel: The LORD our God is one LORD." },
  { text: "Thou shalt love the LORD thy God with all thine heart", ref: "Deuteronomy 6:5", fullText: "And thou shalt love the LORD thy God with all thine heart, and with all thy soul, and with all thy might." },
  { text: "Man doth not live by bread only", ref: "Deuteronomy 8:3", fullText: "And he humbled thee, and suffered thee to hunger, and fed thee with manna, which thou knewest not, neither did thy fathers know; that he might make thee know that man doth not live by bread only, but by every word that proceedeth out of the mouth of the LORD doth man live." },
  { text: "Be strong and of a good courage", ref: "Deuteronomy 31:6", fullText: "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee." },

  // Joshua
  { text: "As for me and my house, we will serve the LORD", ref: "Joshua 24:15", fullText: "And if it seem evil unto you to serve the LORD, choose you this day whom ye will serve; whether the gods which your fathers served that were on the other side of the flood, or the gods of the Amorites, in whose land ye dwell: but as for me and my house, we will serve the LORD." },

  // Psalms
  { text: "The LORD is my shepherd; I shall not want", ref: "Psalm 23:1", fullText: "The LORD is my shepherd; I shall not want." },
  { text: "Yea, though I walk through the valley of the shadow of death", ref: "Psalm 23:4", fullText: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me." },
  { text: "The earth is the LORD's, and the fulness thereof", ref: "Psalm 24:1", fullText: "The earth is the LORD's, and the fulness thereof; the world, and they that dwell therein." },
  { text: "The LORD is my light and my salvation", ref: "Psalm 27:1", fullText: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?" },
  { text: "Be still, and know that I am God", ref: "Psalm 46:10", fullText: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
  { text: "Create in me a clean heart, O God", ref: "Psalm 51:10", fullText: "Create in me a clean heart, O God; and renew a right spirit within me." },
  { text: "He that dwelleth in the secret place of the most High", ref: "Psalm 91:1", fullText: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty." },
  { text: "This is the day which the LORD hath made", ref: "Psalm 118:24", fullText: "This is the day which the LORD hath made; we will rejoice and be glad in it." },
  { text: "Thy word is a lamp unto my feet", ref: "Psalm 119:105", fullText: "Thy word is a lamp unto my feet, and a light unto my path." },
  { text: "I will lift up mine eyes unto the hills", ref: "Psalm 121:1", fullText: "I will lift up mine eyes unto the hills, from whence cometh my help." },
  { text: "Children are an heritage of the LORD", ref: "Psalm 127:3", fullText: "Lo, children are an heritage of the LORD: and the fruit of the womb is his reward." },
  { text: "I will praise thee; for I am fearfully and wonderfully made", ref: "Psalm 139:14", fullText: "I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well." },

  // Proverbs
  { text: "Trust in the LORD with all thine heart", ref: "Proverbs 3:5", fullText: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
  { text: "In all thy ways acknowledge him", ref: "Proverbs 3:6", fullText: "In all thy ways acknowledge him, and he shall direct thy paths." },
  { text: "The fear of the LORD is the beginning of wisdom", ref: "Proverbs 9:10", fullText: "The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding." },
  { text: "A soft answer turneth away wrath", ref: "Proverbs 15:1", fullText: "A soft answer turneth away wrath: but grievous words stir up anger." },
  { text: "Train up a child in the way he should go", ref: "Proverbs 22:6", fullText: "Train up a child in the way he should go: and when he is old, he will not depart from it." },
  { text: "Iron sharpeneth iron", ref: "Proverbs 27:17", fullText: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." },
  { text: "Where there is no vision, the people perish", ref: "Proverbs 29:18", fullText: "Where there is no vision, the people perish: but he that keepeth the law, happy is he." },
  { text: "Who can find a virtuous woman?", ref: "Proverbs 31:10", fullText: "Who can find a virtuous woman? for her price is far above rubies." },

  // Ecclesiastes
  { text: "To every thing there is a season", ref: "Ecclesiastes 3:1", fullText: "To every thing there is a season, and a time to every purpose under the heaven." },

  // Isaiah
  { text: "They that wait upon the LORD shall renew their strength", ref: "Isaiah 40:31", fullText: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
  { text: "For unto us a child is born, unto us a son is given", ref: "Isaiah 9:6", fullText: "For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace." },
  { text: "All we like sheep have gone astray", ref: "Isaiah 53:6", fullText: "All we like sheep have gone astray; we have turned every one to his own way; and the LORD hath laid on him the iniquity of us all." },
  { text: "He was wounded for our transgressions", ref: "Isaiah 53:5", fullText: "But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed." },
  { text: "Come now, and let us reason together", ref: "Isaiah 1:18", fullText: "Come now, and let us reason together, saith the LORD: though your sins be as scarlet, they shall be as white as snow; though they be red like crimson, they shall be as wool." },
  { text: "Fear thou not; for I am with thee", ref: "Isaiah 41:10", fullText: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness." },

  // Jeremiah
  { text: "For I know the thoughts that I think toward you", ref: "Jeremiah 29:11", fullText: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end." },
  { text: "Call unto me, and I will answer thee", ref: "Jeremiah 33:3", fullText: "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not." },

  // Micah
  { text: "What doth the LORD require of thee", ref: "Micah 6:8", fullText: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?" },

  // Nahum
  { text: "The LORD is good, a strong hold in the day of trouble", ref: "Nahum 1:7", fullText: "The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him." },

  // Malachi
  { text: "For I am the LORD, I change not", ref: "Malachi 3:6", fullText: "For I am the LORD, I change not; therefore ye sons of Jacob are not consumed." },

  // Matthew
  { text: "Ye are the light of the world", ref: "Matthew 5:14", fullText: "Ye are the light of the world. A city that is set on an hill cannot be hid." },
  { text: "But seek ye first the kingdom of God", ref: "Matthew 6:33", fullText: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
  { text: "Ask, and it shall be given you", ref: "Matthew 7:7", fullText: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you." },
  { text: "Come unto me, all ye that labour", ref: "Matthew 11:28", fullText: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { text: "For where two or three are gathered together", ref: "Matthew 18:20", fullText: "For where two or three are gathered together in my name, there am I in the midst of them." },
  { text: "With God all things are possible", ref: "Matthew 19:26", fullText: "But Jesus beheld them, and said unto them, With men this is impossible; but with God all things are possible." },
  { text: "Go ye therefore, and teach all nations", ref: "Matthew 28:19", fullText: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost." },
  { text: "Heaven and earth shall pass away, but my words shall not", ref: "Matthew 24:35", fullText: "Heaven and earth shall pass away, but my words shall not pass away." },

  // Mark
  { text: "With God all things are possible", ref: "Mark 10:27", fullText: "And Jesus looking upon them saith, With men it is impossible, but not with God: for with God all things are possible." },

  // John
  { text: "For God so loved the world", ref: "John 3:16", fullText: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { text: "I am the way, the truth, and the life", ref: "John 14:6", fullText: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
  { text: "In the beginning was the Word", ref: "John 1:1", fullText: "In the beginning was the Word, and the Word was with God, and the Word was God." },
  { text: "And ye shall know the truth", ref: "John 8:32", fullText: "And ye shall know the truth, and the truth shall make you free." },
  { text: "I am the good shepherd", ref: "John 10:11", fullText: "I am the good shepherd: the good shepherd giveth his life for the sheep." },
  { text: "I am the vine, ye are the branches", ref: "John 15:5", fullText: "I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing." },
  { text: "Peace I leave with you, my peace I give unto you", ref: "John 14:27", fullText: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid." },
  { text: "Jesus wept", ref: "John 11:35", fullText: "Jesus wept." },
  { text: "Greater love hath no man than this", ref: "John 15:13", fullText: "Greater love hath no man than this, that a man lay down his life for his friends." },

  // Acts
  { text: "But ye shall receive power, after that the Holy Ghost is come", ref: "Acts 1:8", fullText: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth." },

  // Romans
  { text: "For all have sinned, and come short of the glory of God", ref: "Romans 3:23", fullText: "For all have sinned, and come short of the glory of God." },
  { text: "The wages of sin is death", ref: "Romans 6:23", fullText: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord." },
  { text: "All things work together for good", ref: "Romans 8:28", fullText: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { text: "If God be for us, who can be against us?", ref: "Romans 8:31", fullText: "What shall we then say to these things? If God be for us, who can be against us?" },
  { text: "Be not conformed to this world", ref: "Romans 12:2", fullText: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God." },
  { text: "Faith cometh by hearing", ref: "Romans 10:17", fullText: "So then faith cometh by hearing, and hearing by the word of God." },

  // 1 Corinthians
  { text: "Love is patient, love is kind", ref: "1 Corinthians 13:4", fullText: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up." },
  { text: "And now abideth faith, hope, charity", ref: "1 Corinthians 13:13", fullText: "And now abideth faith, hope, charity, these three; but the greatest of these is charity." },
  { text: "Your body is the temple of the Holy Ghost", ref: "1 Corinthians 6:19", fullText: "What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own?" },

  // 2 Corinthians
  { text: "If any man be in Christ, he is a new creature", ref: "2 Corinthians 5:17", fullText: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new." },
  { text: "My grace is sufficient for thee", ref: "2 Corinthians 12:9", fullText: "And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness." },
  { text: "God loveth a cheerful giver", ref: "2 Corinthians 9:7", fullText: "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver." },

  // Galatians
  { text: "The fruit of the Spirit is love, joy, peace", ref: "Galatians 5:22", fullText: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith." },
  { text: "Be not deceived; God is not mocked", ref: "Galatians 6:7", fullText: "Be not deceived; God is not mocked: for whatsoever a man soweth, that shall he also reap." },

  // Ephesians
  { text: "For by grace are ye saved through faith", ref: "Ephesians 2:8", fullText: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God." },
  { text: "Put on the whole armour of God", ref: "Ephesians 6:11", fullText: "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil." },

  // Philippians
  { text: "I can do all things through Christ", ref: "Philippians 4:13", fullText: "I can do all things through Christ which strengtheneth me." },
  { text: "My God shall supply all your need", ref: "Philippians 4:19", fullText: "But my God shall supply all your need according to his riches in glory by Christ Jesus." },
  { text: "Let this mind be in you, which was also in Christ Jesus", ref: "Philippians 2:5", fullText: "Let this mind be in you, which was also in Christ Jesus." },

  // Colossians
  { text: "And whatsoever ye do, do it heartily, as to the Lord", ref: "Colossians 3:23", fullText: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men." },

  // 2 Timothy
  { text: "All scripture is given by inspiration of God", ref: "2 Timothy 3:16", fullText: "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness." },
  { text: "I have fought a good fight, I have finished my course", ref: "2 Timothy 4:7", fullText: "I have fought a good fight, I have finished my course, I have kept the faith." },

  // Hebrews
  { text: "Now faith is the substance of things hoped for", ref: "Hebrews 11:1", fullText: "Now faith is the substance of things hoped for, the evidence of things not seen." },
  { text: "Jesus Christ the same yesterday, and to day, and for ever", ref: "Hebrews 13:8", fullText: "Jesus Christ the same yesterday, and to day, and for ever." },

  // James
  { text: "Faith without works is dead", ref: "James 2:26", fullText: "For as the body without the spirit is dead, so faith without works is dead also." },
  { text: "If any of you lack wisdom, let him ask of God", ref: "James 1:5", fullText: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him." },
  { text: "Resist the devil, and he will flee from you", ref: "James 4:7", fullText: "Submit yourselves therefore to God. Resist the devil, and he will flee from you." },

  // 1 Peter
  { text: "Casting all your care upon him; for he careth for you", ref: "1 Peter 5:7", fullText: "Casting all your care upon him; for he careth for you." },

  // 1 John
  { text: "If we confess our sins, he is faithful and just", ref: "1 John 1:9", fullText: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness." },
  { text: "God is love", ref: "1 John 4:8", fullText: "He that loveth not knoweth not God; for God is love." },
  { text: "There is no fear in love; but perfect love casteth out fear", ref: "1 John 4:18", fullText: "There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love." },

  // Revelation
  { text: "Behold, I stand at the door, and knock", ref: "Revelation 3:20", fullText: "Behold, I stand at the door, and knock: if any man hear my voice, and open the door, I will come in to him, and will sup with him, and he with me." },
  { text: "I am Alpha and Omega, the beginning and the ending", ref: "Revelation 1:8", fullText: "I am Alpha and Omega, the beginning and the ending, saith the Lord, which is, and which was, and which is to come, the Almighty." },
]

export default SCRIPTURE_MATCHES
