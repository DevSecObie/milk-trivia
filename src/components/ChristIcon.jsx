export default function ChristIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'inline-block', verticalAlign: -3 }}>
      {/* White wool/afro hair */}
      <ellipse cx="16" cy="11" rx="12" ry="10" fill="#F0F0F0" />
      <ellipse cx="16" cy="9" rx="11" ry="8" fill="#E8E8E8" />
      {/* Wool texture bumps */}
      <circle cx="8" cy="7" r="3" fill="#F5F5F5" />
      <circle cx="14" cy="4" r="3.5" fill="#F5F5F5" />
      <circle cx="21" cy="5" r="3" fill="#F5F5F5" />
      <circle cx="25" cy="8" r="2.5" fill="#F5F5F5" />
      <circle cx="6" cy="11" r="2.5" fill="#F0F0F0" />
      <circle cx="26" cy="12" r="2" fill="#F0F0F0" />
      {/* Dark brown/black face */}
      <ellipse cx="16" cy="16" rx="8" ry="9" fill="#3D2114" />
      {/* Red/fiery eyes */}
      <ellipse cx="12.5" cy="14.5" rx="1.8" ry="1.5" fill="#FF2222" />
      <ellipse cx="19.5" cy="14.5" rx="1.8" ry="1.5" fill="#FF2222" />
      <circle cx="12.5" cy="14.5" r="0.7" fill="#FF6600" />
      <circle cx="19.5" cy="14.5" r="0.7" fill="#FF6600" />
      {/* Nose */}
      <ellipse cx="16" cy="17.5" rx="1.2" ry="1" fill="#2A1509" />
      {/* White beard */}
      <path d="M9 20 Q10 19 12 19.5 Q14 20 16 20 Q18 20 20 19.5 Q22 19 23 20 Q23 24 20 27 Q18 29 16 29 Q14 29 12 27 Q9 24 9 20Z" fill="#F0F0F0" />
      <path d="M10 21 Q12 20.5 16 21 Q20 20.5 22 21 Q22 24 19 26.5 Q17 28 16 28 Q15 28 13 26.5 Q10 24 10 21Z" fill="#E8E8E8" />
    </svg>
  )
}
