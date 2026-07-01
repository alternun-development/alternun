/* Desktop dashboard — wider layout with collapsible sidebar, main, insights */

function DesktopSidebar({ isDark, active = 'dashboard', collapsed, locked, onToggleCollapse, onToggleLock }) {
  const items = [
    { id: 'dashboard', icon: <Ic.home size={18}/>, label: 'Dashboard', badge: null },
    { id: 'portfolio', icon: <Ic.chart size={18}/>, label: 'Portafolio', badge: null },
    { id: 'projects', icon: <Ic.leaf size={18}/>, label: 'Proyectos', badge: '7' },
    { id: 'explore', icon: <Ic.compass size={18}/>, label: 'Explorar', badge: null },
    { id: 'wallet', icon: <Ic.wallet size={18}/>, label: 'Cartera', badge: null },
    { id: 'activity', icon: <Ic.trend size={18}/>, label: 'Actividad', badge: '3' },
  ];
  const support = [
    { id: 'settings', icon: <Ic.user size={18}/>, label: 'Perfil', badge: null },
    { id: 'help', icon: <Ic.info size={18}/>, label: 'Ayuda', badge: null },
  ];

  const W = collapsed ? 68 : 240;

  return (
    <div style={{
      width: W, background: 'var(--bg-section)',
      padding: collapsed ? '20px 10px' : '20px 16px',
      display: 'flex', flexDirection: 'column',
      boxShadow: 'inset -1px 0 0 var(--nav-border)',
      transition: 'width 280ms var(--ease-spring), padding 280ms var(--ease-spring)',
      position: 'relative', flexShrink: 0,
    }}>
      {/* Brand + collapse handle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10, padding: collapsed ? '0 0 20px' : '0 6px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <AirsMark size={34} fill={isDark ? 'var(--p-teal)' : 'var(--p-teal-dark)'} bg={isDark ? '#050f0c' : '#eaf8f3'}/>
          {!collapsed && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>Airs</div>
              <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', marginTop: 2 }}>BY ALTERNUN</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onToggleLock} title={locked ? 'Bloqueado abierto' : 'Desbloqueado'} style={{
            width: 24, height: 24, borderRadius: 6,
            display: 'grid', placeItems: 'center', color: locked ? 'var(--accent)' : 'var(--text-faint)',
            background: locked ? 'var(--accent-muted)' : 'transparent',
            transition: 'all var(--dur-fast) var(--ease-out)',
          }}>
            <Ic.lock size={12} open={!locked}/>
          </button>
        )}
      </div>

      <NavGroup label="Principal" items={items} active={active} collapsed={collapsed}/>
      <div style={{ flex: 1 }}/>
      <NavGroup label="Cuenta" items={support} active={active} collapsed={collapsed}/>

      {!collapsed && (
        <div style={{
          marginTop: 16, padding: 14, borderRadius: 'var(--r-xl)',
          background: 'var(--accent-muted)',
          boxShadow: 'inset 0 0 0 1px var(--border-accent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ic.leaf size={14}/>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>Sube a Platinum</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
            Te faltan <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>7,520</span> Airs.
          </div>
          <ActionButton label="Compensar más" variant="filled"/>
        </div>
      )}

      {/* Collapse handle on the edge */}
      <button onClick={onToggleCollapse} style={{
        position: 'absolute', top: 32, right: -11, zIndex: 20,
        width: 22, height: 22, borderRadius: 11,
        background: 'var(--bg-card)', color: 'var(--text-secondary)',
        boxShadow: 'inset 0 0 0 1px var(--border-hairline), var(--e1)',
        display: 'grid', placeItems: 'center',
        transition: 'transform var(--dur-base) var(--ease-out)',
      }}>
        <div style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 280ms var(--ease-spring)' }}>
          <Ic.chev size={11}/>
        </div>
      </button>
    </div>
  );
}
function NavGroup({ label, items, active, collapsed }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {!collapsed && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '10px 10px 6px' }}>{label}</div>
      )}
      {collapsed && <div style={{ height: 12 }}/>}
      {items.map(it => {
        const isActive = it.id === active;
        return (
          <div key={it.id} style={{ position: 'relative' }} className="nav-item">
            <button style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10, padding: collapsed ? '10px 0' : '9px 10px',
              borderRadius: 'var(--r-md)',
              background: isActive ? 'var(--accent-muted)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: isActive ? 700 : 500,
              boxShadow: isActive ? 'inset 0 0 0 1px var(--border-accent)' : 'none',
              transition: 'all var(--dur-fast) var(--ease-out)',
              position: 'relative',
            }}>
              {/* active indicator rail */}
              {isActive && (
                <span style={{
                  position: 'absolute', left: collapsed ? 4 : -10, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 18, borderRadius: 2, background: 'var(--accent)',
                  boxShadow: '0 0 10px var(--accent)',
                }}/>
              )}
              {it.icon}
              {!collapsed && <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>}
              {!collapsed && it.badge && (
                <span style={{
                  background: isActive ? 'var(--accent)' : 'var(--bg-inset)',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                  fontFamily: 'var(--ff-mono)',
                }}>{it.badge}</span>
              )}
              {collapsed && it.badge && (
                <span style={{
                  position: 'absolute', top: 4, right: 6,
                  width: 14, height: 14, borderRadius: 7,
                  background: 'var(--accent)', color: 'var(--accent-text)',
                  fontSize: 9, fontWeight: 800, display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--ff-mono)',
                }}>{it.badge}</span>
              )}
            </button>
            {/* Tooltip (collapsed mode) */}
            {collapsed && (
              <span className="nav-tooltip" style={{
                position: 'absolute', left: 58, top: '50%', transform: 'translateY(-50%)',
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                padding: '6px 10px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                boxShadow: 'var(--e2)', pointerEvents: 'none',
                opacity: 0, transition: 'opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
                zIndex: 100,
              }}>{it.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DesktopTopbar({ isDark, onToggle }) {
  return (
    <div style={{
      height: 64, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16,
      background: 'var(--nav-bg)', boxShadow: 'inset 0 -1px 0 var(--nav-border)',
    }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lunes, 12 febrero</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Buen día, José</div>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '60%', maxWidth: 440, height: 38, borderRadius: 999,
          background: 'var(--bg-inset)', boxShadow: 'inset 0 0 0 1px var(--border-hairline)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
          color: 'var(--text-muted)', fontSize: 13,
        }}>
          <Ic.search size={15}/>
          <span>Buscar proyectos, tokens, ubicaciones…</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--ff-mono)', padding: '2px 6px', background: 'var(--bg-card)', borderRadius: 4, boxShadow: 'inset 0 0 0 1px var(--border-hairline)' }}>⌘ K</span>
        </div>
      </div>
      <button onClick={onToggle} style={{
        width: 36, height: 36, borderRadius: 18, background: 'var(--bg-inset)',
        boxShadow: 'inset 0 0 0 1px var(--border-hairline)',
        display: 'grid', placeItems: 'center', color: 'var(--text-secondary)',
      }}>{isDark ? <Ic.sun/> : <Ic.moon/>}</button>
      <button style={{
        width: 36, height: 36, borderRadius: 18, background: 'var(--bg-inset)',
        boxShadow: 'inset 0 0 0 1px var(--border-hairline)',
        display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', position: 'relative',
      }}>
        <Ic.bell size={16}/>
        <span style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', boxShadow: '0 0 0 2px var(--nav-bg)' }}/>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10, boxShadow: 'inset 1px 0 0 var(--nav-border)' }}>
        <Avatar name="José Santiago" size={34}/>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.1 }}>José Santiago</div>
          <div style={{ fontSize: 10, color: '#d4b96a', fontWeight: 700, letterSpacing: '0.08em' }}>GOLD · 12,480</div>
        </div>
      </div>
    </div>
  );
}

/* Sparkline */
function Sparkline({ values, color = 'var(--accent)', height = 60, width = 320, fill = true }) {
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return [x, y];
  });
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  const area = path + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={area} fill="url(#sparkFill)"/>}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="4" fill={color}/>
      <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="8" fill={color} opacity="0.24"/>
    </svg>
  );
}

/* Big hero score panel for desktop */
function DesktopHero({ isDark }) {
  const score = 12480;
  const heroBg = isDark ? '#050f0c' : '#eaf8f3';
  const textMain = isDark ? '#fff' : '#0b2d31';
  const textDim = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(11,45,49,0.6)';
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 'var(--r-2xl)', background: heroBg,
      padding: '24px 28px',
      boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'inset 0 0 0 1px rgba(11,45,49,0.08)',
      display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'center',
    }}>
      <div style={{
        position: 'absolute', top: -100, right: -80, width: 320, height: 320, borderRadius: '50%',
        background: isDark ? 'radial-gradient(circle, rgba(30,230,181,0.18), transparent 65%)'
                           : 'radial-gradient(circle, rgba(13,148,136,0.12), transparent 65%)',
        pointerEvents: 'none',
      }}/>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textDim, marginBottom: 8 }}>Puntuación regenerativa</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <AirsMark size={52} fill={isDark ? 'var(--p-teal)' : 'var(--p-teal-dark)'} bg={heroBg}/>
          <div className="mono tabular" style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', color: textMain, lineHeight: 1 }}>
            {score.toLocaleString('es-ES')}
          </div>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignSelf: 'flex-end', paddingBottom: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 999, background: 'rgba(52,211,153,0.15)',
              color: '#34d399', fontSize: 11, fontWeight: 700,
            }}><Ic.arrowUp size={10}/>+2.8%</span>
            <span style={{ fontSize: 10, color: textDim, marginTop: 4 }}>vs mes anterior</span>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999,
            boxShadow: 'inset 0 0 0 1px #d4b96a44',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#d4b96a', boxShadow: '0 0 8px #d4b96a' }}/>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#d4b96a' }}>STATUS GOLD</span>
          </div>
          <span style={{ fontSize: 12, color: textDim }}>7,520 Airs para Platinum</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: textMain, fontWeight: 700 }}>Progreso a Platinum — 62%</span>
            <span className="mono" style={{ color: textDim }}>12,480 / 20,000</span>
          </div>
          <ProgressBar progress={0.624} color="#d4b96a" height={8}/>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textDim, marginBottom: 6 }}>Últimos 30 días</div>
        <Sparkline values={[8200, 8400, 8700, 9100, 9400, 9200, 9800, 10100, 10400, 10800, 10600, 11000, 11300, 11500, 11800, 11700, 12000, 12200, 12100, 12300, 12480]} color={isDark ? 'var(--p-teal)' : 'var(--p-teal-dark)'} width={360} height={100}/>
      </div>
    </div>
  );
}

function DesktopProjectRow({ name, location, type, score, delta, progress, color = 'var(--accent)' }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.8fr 0.8fr 1.2fr 0.6fr',
      gap: 16, alignItems: 'center', padding: '14px 0',
      boxShadow: 'inset 0 -1px 0 var(--divider)', fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <IconBadge icon={<Ic.leaf size={14}/>} color={color} size="sm"/>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{location}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{type}</div>
      <div className="mono tabular" style={{ fontWeight: 700 }}>{score}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: delta.startsWith('+') ? '#34d399' : 'var(--error-text)' }}>{delta}</div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
          <span>{Math.round(progress*100)}%</span>
          <span className="mono">{(progress * 1200).toFixed(0)}/1200</span>
        </div>
        <ProgressBar progress={progress} color={color} height={5} shimmer={false}/>
      </div>
      <div style={{ textAlign: 'right' }}><Ic.chev/></div>
    </div>
  );
}

function DesktopDashboard({ isDark = true, onToggle }) {
  const [locked, setLocked] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const collapsed = !locked && !hovered;
  return (
    <div className={isDark ? 'theme-dark' : 'theme-light'} style={{
      width: '100%', height: '100%', background: 'var(--bg-screen)',
      color: 'var(--text-primary)', display: 'flex',
      fontFamily: 'var(--ff-sans)', overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        .nav-item:hover .nav-tooltip { opacity: 1 !important; transform: translateY(-50%) translateX(4px) !important; }
      `}</style>
      <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} style={{ display: 'flex' }}>
        <DesktopSidebar isDark={isDark} active="dashboard"
          collapsed={collapsed} locked={locked}
          onToggleCollapse={()=>setLocked(l => !l)}
          onToggleLock={()=>setLocked(l => !l)}/>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <DesktopTopbar isDark={isDark} onToggle={onToggle}/>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>
          {/* Hero */}
          <DesktopHero isDark={isDark}/>

          {/* Stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 20 }}>
            <StatCard label="Airs ganados" value="12,480" delta="+340" deltaPositive icon={<Ic.trend/>}/>
            <StatCard label="Proyectos activos" value="7" delta="+2" deltaPositive icon={<Ic.leaf/>} accentColor="#34d399"/>
            <StatCard label="Balance" value="12,088" delta="-120" deltaPositive={false} icon={<Ic.wallet/>} accentColor="#d4b96a"/>
            <StatCard label="CO₂ compensado" value="3.4 t" delta="+0.2" deltaPositive icon={<Ic.mountain/>} accentColor="#818cf8"/>
          </div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 20, marginTop: 20 }}>
            {/* Projects table */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Tus proyectos regenerativos</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>7 activos · actualizados hace 2h</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <FilterPill label="Todos" active count={7} onPress={()=>{}}/>
                  <FilterPill label="Reforestación" count={4} onPress={()=>{}}/>
                  <FilterPill label="Marino" count={2} onPress={()=>{}}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.8fr 0.8fr 1.2fr 0.6fr', gap: 16, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', boxShadow: 'inset 0 -1px 0 var(--divider)' }}>
                <span>Proyecto</span><span>Tipo</span><span>Airs</span><span>30 días</span><span>Progreso</span><span></span>
              </div>
              <DesktopProjectRow name="Sierra Nevada" location="Santa Marta, CO" type="Reforestación" score="+340" delta="+12.4%" progress={0.84} color="#34d399"/>
              <DesktopProjectRow name="Amazonía Viva" location="Leticia, CO" type="Biodiversidad" score="+240" delta="+8.2%" progress={0.62} color="var(--p-teal)"/>
              <DesktopProjectRow name="Arrecife Azul" location="Providencia, CO" type="Marino" score="+180" delta="+5.1%" progress={0.54} color="#818cf8"/>
              <DesktopProjectRow name="Manglar Tayrona" location="Magdalena, CO" type="Marino" score="+140" delta="-1.8%" progress={0.41} color="#a8b8cc"/>
              <DesktopProjectRow name="Páramo Sumapaz" location="Cundinamarca, CO" type="Hídrico" score="+120" delta="+3.4%" progress={0.33} color="#d4b96a"/>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.01em' }}>Actividad</div>
                <div style={{ margin: '0 -20px' }}>
                  <LedgerRow icon={<Ic.leaf size={14}/>} iconColor="#34d399"
                    title="Reforestación S. Nevada" subtitle="Hace 2 horas · Verificado" amount="+340 Airs"/>
                  <LedgerRow icon={<Ic.mountain size={14}/>} iconColor="var(--accent)"
                    title="Compensación CO₂" subtitle="Ayer · 0.2 t" amount="+120 Airs"/>
                  <LedgerRow icon={<Ic.wallet size={14}/>} iconColor="#d4b96a"
                    title="Canje · Café Sierra" subtitle="12 FEB" amount="-80 Airs" amountPositive={false}/>
                  <LedgerRow icon={<Ic.leaf size={14}/>} iconColor="#34d399"
                    title="Arrecife Azul" subtitle="10 FEB · Verificado" amount="+180 Airs" last/>
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Distribución</div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--ff-mono)' }}>12,480 Airs</span>
                </div>
                <Donut data={[
                  { label: 'Reforestación', value: 58, color: '#34d399' },
                  { label: 'Biodiversidad', value: 22, color: 'var(--p-teal)' },
                  { label: 'Marino', value: 14, color: '#818cf8' },
                  { label: 'Hídrico', value: 6,  color: '#d4b96a' },
                ]}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Donut({ data }) {
  const size = 160, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = data.reduce((a, b) => a + b.value, 0);
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-inset)" strokeWidth={stroke}/>
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const el = (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset} strokeLinecap="butt"/>
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }}/>
            <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{d.label}</span>
            <span className="mono tabular" style={{ fontWeight: 700 }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DesktopDashboard, DesktopSidebar, DesktopTopbar, DesktopHero, Sparkline, Donut });
