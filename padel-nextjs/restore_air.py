import os
import re

file_path = '/Users/duapmip/Documents/perso/code/padelspot/padel-nextjs/src/components/ClubBookingInterface.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Restore breathing room in the rest of the interface
content = content.replace("padding: '2rem 0'", "padding: '5rem 0'")
content = content.replace("gap: '0.25rem'", "gap: '4rem'") # Main container gap
content = content.replace("marginBottom: '0.25rem'", "marginBottom: '2rem'") # Button/Input margins
content = content.replace("fontSize: '1.5rem', fontWeight: 950", "fontSize: '3rem', fontWeight: 950") # Title size

# 2. Refine the Day Header (High-end minimal)
# Pattern to match the current compact header
header_pattern = r"<div style={{\s+padding: '0\.4rem 0\.5rem',\s+background: isToday \? 'var\(--sun-blaze\)' : \(hasSlots \? 'var\(--pitch-black\)' : 'transparent'\),\s+color: isToday \|\| hasSlots \? '#fff' : 'rgba\(0,0,0,0\.25\)',\s+borderRadius: '0\.75rem',\s+textAlign: 'center',\s+opacity: isPast && !isToday \? 0\.2 : 1,\s+transition: 'all 0\.3s ease',\s+display: 'flex',\s+flexDirection: 'row',\s+alignItems: 'baseline',\s+justifyContent: 'center',\s+gap: '0\.35rem',\s+position: 'relative',\s+border: isToday \|\| hasSlots \? 'none' : '1px solid rgba\(0,0,0,0\.02\)'\s+}}>"

new_header = """<div style={{ 
                                                                padding: '0.25rem 0.5rem',
                                                                background: isToday ? 'var(--sun-blaze)' : 'transparent',
                                                                color: isToday ? '#fff' : (hasSlots ? 'var(--pitch-black)' : 'rgba(0,0,0,0.15)'),
                                                                borderRadius: '0.5rem',
                                                                textAlign: 'center',
                                                                opacity: isPast && !isToday ? 0.2 : 1,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                gap: '0px',
                                                                position: 'relative',
                                                                borderBottom: isToday ? 'none' : (hasSlots ? '2px solid var(--sun-blaze)' : 'none')
                                                            }}>"""

content = re.sub(header_pattern, new_header, content, flags=re.DOTALL)

# 3. Refine Header Text: Highlight Day Name, minimize date
# <span style={{ fontSize: '0.45rem', fontWeight: 950, opacity: 0.4, textTransform: 'uppercase' }}>
# {format(day, 'EEEE', { locale: fr })}
# </span>
# <span style={{ fontSize: '0.85rem', fontWeight: 950, fontFamily: 'monospace' }}>{format(day, 'd')}</span>

content = content.replace("fontSize: '0.45rem', fontWeight: 950, opacity: 0.4, textTransform: 'uppercase'", "fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.05em'")
content = content.replace("fontSize: '0.85rem', fontWeight: 950, fontFamily: 'monospace'", "fontSize: '0.55rem', fontWeight: 700, opacity: 0.4")

# 4. Re-add some margin to week dividers
content = content.replace("marginBottom: '1.5rem'", "marginBottom: '4rem'")
content = content.replace("marginBottom: '1rem'", "marginBottom: '2rem'")

with open(file_path, 'w') as f:
    f.write(content)
print("Air restored and calendar headers refined.")
