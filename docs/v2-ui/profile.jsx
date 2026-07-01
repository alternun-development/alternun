/* Profile screen — tier journey, stats, achievements, settings */

function ProfileHeader({ name = 'José Santiago', score = 12480, handle = '@josantiago', isDark }) {
  const tier = resolveTier(score);
  const spec = TIERS[tier];
  const heroBg = isDark ? '#050f0c' : '#eaf8f3';
  const textMain = isDark ? '#fff' : '#0b2d31';
  const textDim = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(11,45,49,0.6)';

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 'var(--r-2xl)', background: heroBg,
      padding: '24px 20px', margin: '0 14px',
      boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'inset 0 0 0 1px rgba(11,45,49,0.08)',
    }}>
      <div style={{
        position: 'absolute', top: -100, right: -80, width: 260, height: 260, borderRadius: '50%',
        background: isDark ? 'radial-gradient(circle, rgba(30,230,181,0.18), transparent 65%)'
                           : 'radial-gradient(circle, rgba(13,148,136,0.12), transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: `linear-gradient(135deg, ${spec.color}, color-mix(in oklab, ${spec.color} 55%, #000))`,
            display: 'grid', placeItems: 'center',
            fontSize: 36, fontWeight: 800, color: '#050510',
            boxShadow: `0 0 0 3px ${heroBg}, 0 0 0 5px ${spec.color}`,
          }}>{getInitials(name)}</div>
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            background: spec.color, color: '#050510',
            padding: '4px 10px', borderRadius: 999,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            boxShadow: `0 0 0 3px ${heroBg}`,
          }}>{spec.label.toUpperCase()}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: textMain }}>{name}</div>
        <div style={{ fontSize: 12, color: textDim, fontFamily: 'var(--ff-mono)', marginTop: 2 }}>{handle}</div>

        <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
          <Stat label="Airs" value={score.toLocaleString('es-ES')} textMain={textMain} textDim={textDim}/>
          <Divi textDim={textDim}/>
          <Stat label="Proyectos" value="7" textMain={textMain} textDim={textDim}/>
          <Divi textDim={textDim}/>
          <Stat label="CO₂" value="3.4 t" textMain={textMain} textDim={textDim}/>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, textMain, textDim }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="mono tabular" style={{ fontSize: 18, fontWeight: 800, color: textMain, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Divi({ textDim }) {
  return <div style={{ width: 1, background: 'currentColor', opacity: 0.18, alignSelf: 'stretch', color: textDim }} />;
}

function TierJourney({ score = 12480 }) {
  const tiers = [
    { id: 'bronze', label: 'Bronze', threshold: 0, color: '#cd7f32' },
    { id: 'silver', label: 'Silver', threshold: 1000, color: '#a8b8cc' },
    { id: 'gold', label: 'Gold', threshold: 5000, color: '#d4b96a' },
    { id: 'platinum', label: 'Platinum', threshold: 20000, color: '#9ba9c4' },
  ];
  const currentIdx = tiers.findIndex(t => t.id === resolveTier(score));
  return (
    <div style={{ margin: '0 14px', background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 14 }}>
        Trayecto tier
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          position: 'absolute', top: 14, left: 14, right: 14, height: 3,
          background: 'var(--bg-inset)', borderRadius: 999,
        }}/>
        <div style={{
          position: 'absolute', top: 14, left: 14, height: 3, borderRadius: 999,
          width: `calc(${(currentIdx / (tiers.length - 1)) * 100}% - 28px * ${currentIdx / (tiers.length - 1)})`,
          background: 'linear-gradient(90deg, #cd7f32, #a8b8cc, #d4b96a)',
        }}/>
        {tiers.map((t, i) => {
          const reached = i <= currentIdx;
          return (
            <div key={t.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: reached ? t.color : 'var(--bg-inset)',
                boxShadow: reached ? `0 0 0 3px var(--bg-card), 0 0 12px ${t.color}66` : 'inset 0 0 0 1px var(--border-hairline)',
                display: 'grid', placeItems: 'center',
                color: reached ? '#050510' : 'var(--text-faint)',
                fontSize: 11, fontWeight: 800,
              }}>
                {i === currentIdx ? <Ic.check size={12}/> : (i+1)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: reached ? 'var(--text-primary)' : 'var(--text-faint)', marginTop: 6, letterSpacing: '0.04em' }}>
                {t.label}
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                {t.threshold >= 1000 ? `${t.threshold/1000}K` : t.threshold}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Achievement({ icon, label, color, unlocked = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: unlocked ? 1 : 0.4 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: unlocked ? `color-mix(in oklab, ${color} 18%, transparent)` : 'var(--bg-inset)',
        boxShadow: unlocked ? `inset 0 0 0 1px color-mix(in oklab, ${color} 40%, transparent)` : 'inset 0 0 0 1px var(--border-hairline)',
        display: 'grid', placeItems: 'center',
        color: unlocked ? color : 'var(--text-faint)',
      }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2, maxWidth: 70 }}>{label}</div>
    </div>
  );
}

function SettingRow({ icon, iconColor, label, value, danger, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
      boxShadow: last ? 'none' : 'inset 0 -1px 0 var(--divider)',
    }}>
      <IconBadge icon={icon} color={iconColor || (danger ? 'var(--p-error)' : 'var(--accent)')} size="sm"/>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: danger ? 'var(--error-text)' : 'var(--text-primary)' }}>{label}</div>
      {value && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{value}</div>}
      <Ic.chev/>
    </div>
  );
}

function ProfileScreen({ isDark = true }) {
  return (
    <div className={isDark ? 'theme-dark' : 'theme-light'} style={{
      width: '100%', height: '100%', background: 'var(--bg-screen)',
      color: 'var(--text-primary)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: 'var(--ff-sans)',
    }}>
      <div style={{ paddingTop: 50 }} />
      <TopNavBar isDark={isDark} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>
        <div style={{ padding: '14px 0 0' }}>
          <ProfileHeader isDark={isDark}/>
        </div>
        <SectionHeader label="Tier journey"/>
        <TierJourney score={12480}/>

        <SectionHeader label="Logros" action="Ver todos"/>
        <div style={{ margin: '0 14px', background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', padding: 16,
                     display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Achievement icon={<Ic.leaf size={22}/>} label="Primer árbol" color="#34d399"/>
          <Achievement icon={<Ic.mountain size={22}/>} label="10 kg CO₂" color="var(--p-teal)"/>
          <Achievement icon={<Ic.trend size={22}/>} label="1K Airs" color="#d4b96a"/>
          <Achievement icon={<Ic.compass size={22}/>} label="5K Airs" color="#818cf8"/>
          <Achievement icon={<Ic.check size={22}/>} label="KYC verificado" color="var(--p-teal)"/>
          <Achievement icon={<Ic.plus size={22}/>} label="Recluta" color="#a8b8cc"/>
          <Achievement icon={<Ic.user size={22}/>} label="Socio" color="#cd7f32"/>
          <Achievement icon={<Ic.wallet size={22}/>} label="Platinum" color="#9ba9c4" unlocked={false}/>
        </div>

        <SectionHeader label="Cuenta"/>
        <div style={{ margin: '0 14px', background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', overflow: 'hidden' }}>
          <SettingRow icon={<Ic.user size={14}/>} label="Información personal" value="Verificado"/>
          <SettingRow icon={<Ic.wallet size={14}/>} iconColor="#d4b96a" label="Método de pago" value="•• 4287"/>
          <SettingRow icon={<Ic.bell size={14}/>} iconColor="#818cf8" label="Notificaciones" value="On"/>
          <SettingRow icon={<Ic.leaf size={14}/>} iconColor="#34d399" label="Proyectos favoritos" value="7" last/>
        </div>

        <SectionHeader label="Preferencias"/>
        <div style={{ margin: '0 14px', background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', overflow: 'hidden' }}>
          <SettingRow icon={<Ic.moon size={14}/>} label="Tema" value={isDark ? 'Oscuro' : 'Claro'}/>
          <SettingRow icon={<Ic.info size={14}/>} label="Idioma" value="Español"/>
          <SettingRow icon={<Ic.x size={14}/>} label="Cerrar sesión" danger last/>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-faint)', marginTop: 20, fontFamily: 'var(--ff-mono)' }}>
          Alternun Airs · v2.4.1
        </div>
      </div>
      <BottomTabBar active="me"/>
    </div>
  );
}

Object.assign(window, { ProfileScreen, ProfileHeader, TierJourney, Achievement, SettingRow });
