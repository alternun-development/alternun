/* Dashboard screen — composes all v2 primitives into the mobile layout */
const { useState: useStateD } = React;

function TopNavBar({ isDark, onToggle, name = 'José Santiago' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px 12px', background: 'var(--nav-bg)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: 'inset 0 -1px 0 var(--nav-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AirsMark size={32} fill={isDark ? 'var(--p-teal)' : 'var(--p-teal-dark)'} bg={isDark ? '#050f0c' : '#eaf8f3'} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1 }}>Airs</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.08em', marginTop: 2 }}>BY ALTERNUN</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onToggle} style={{
          width: 36, height: 36, borderRadius: 18,
          background: 'var(--bg-inset)',
          boxShadow: 'inset 0 0 0 1px var(--border-hairline)',
          display: 'grid', placeItems: 'center', color: 'var(--text-secondary)',
        }}>{isDark ? <Ic.sun/> : <Ic.moon/>}</button>
        <button style={{
          width: 36, height: 36, borderRadius: 18,
          background: 'var(--bg-inset)',
          boxShadow: 'inset 0 0 0 1px var(--border-hairline)',
          display: 'grid', placeItems: 'center', color: 'var(--text-secondary)',
          position: 'relative',
        }}>
          <Ic.bell size={16}/>
          <span style={{
            position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4,
            background: 'var(--accent)', boxShadow: '0 0 0 2px var(--nav-bg)',
          }}/>
        </button>
        <Avatar name={name} size={36}/>
      </div>
    </div>
  );
}

function SectionHeader({ label, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 18px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      {action && <button style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{action}</button>}
    </div>
  );
}

function LedgerRow({ icon, iconColor = 'var(--accent)', title, subtitle, amount, amountPositive = true, last = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      boxShadow: last ? 'none' : 'inset 0 -1px 0 var(--divider)',
    }}>
      <IconBadge icon={icon} color={iconColor} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <div className="mono tabular" style={{
        fontSize: 14, fontWeight: 700,
        color: amountPositive ? 'var(--accent)' : 'var(--text-primary)',
      }}>{amountPositive ? '+' : ''}{amount}</div>
    </div>
  );
}

function QuickAction({ icon, label, color = 'var(--accent)' }) {
  return (
    <button style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '14px 8px', borderRadius: 'var(--r-lg)',
      background: 'var(--bg-card)', boxShadow: 'var(--e1)',
    }}>
      <IconBadge icon={icon} color={color} size="md" />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
    </button>
  );
}

function BenefitCard({ title, subtitle, tag, tagColor = 'var(--p-gold)', img }) {
  return (
    <div style={{
      minWidth: 220, borderRadius: 'var(--r-xl)', overflow: 'hidden',
      background: 'var(--bg-card)', boxShadow: 'var(--e1)', flexShrink: 0,
    }}>
      <div style={{
        height: 96, background: img || `linear-gradient(135deg, ${tagColor}, color-mix(in oklab, ${tagColor} 40%, #000))`,
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute', top: 10, left: 10,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          padding: '3px 8px', borderRadius: 999,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          backdropFilter: 'blur(8px)',
        }}>{tag}</span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function BottomTabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home', label: 'Inicio', icon: <Ic.home/> },
    { id: 'portfolio', label: 'Portafolio', icon: <Ic.chart/> },
    { id: 'explore', label: 'Explorar', icon: <Ic.compass/> },
    { id: 'me', label: 'Perfil', icon: <Ic.user/> },
  ];
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 8px 14px', background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: 'inset 0 1px 0 var(--nav-border)',
    }}>
      {tabs.map(t => (
        <button key={t.id} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '8px 4px', color: t.id === active ? 'var(--accent)' : 'var(--text-muted)',
        }}>
          {t.icon}
          <span style={{ fontSize: 10, fontWeight: t.id === active ? 700 : 500 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function DashboardScreen({ isDark = true }) {
  return (
    <div className={isDark ? 'theme-dark' : 'theme-light'} style={{
      width: '100%', height: '100%',
      background: 'var(--bg-screen)', color: 'var(--text-primary)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'var(--ff-sans)',
    }}>
      <div style={{ paddingTop: 50 }} />
      <TopNavBar isDark={isDark} onToggle={() => window.__toggleTheme && window.__toggleTheme()} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>
        {/* Hero */}
        <div style={{ padding: '14px 14px 0' }}>
          <HeroPanel displayName="José Santiago" score={12480} isDark={isDark} />
        </div>

        {/* Quick actions */}
        <div style={{ padding: '16px 14px 0', display: 'flex', gap: 10 }}>
          <QuickAction icon={<Ic.arrowUp size={16}/>} label="Depositar" />
          <QuickAction icon={<Ic.arrowRight size={16}/>} label="Transferir" color="#818cf8"/>
          <QuickAction icon={<Ic.leaf size={16}/>} label="Retirar" color="#d4b96a"/>
          <QuickAction icon={<Ic.mountain size={16}/>} label="Proyectos" color="#34d399"/>
        </div>

        {/* Stats */}
        <SectionHeader label="Resumen" action="Ver más" />
        <div style={{ padding: '0 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard label="Airs ganados" value="12,480" delta="+340" deltaPositive icon={<Ic.trend/>}/>
          <StatCard label="Proyectos activos" value="7" delta="+2" deltaPositive icon={<Ic.leaf/>} accentColor="#34d399"/>
          <StatCard label="Balance Airs" value="12,088" delta="-120" deltaPositive={false} icon={<Ic.wallet/>} accentColor="#d4b96a"/>
          <StatCard label="CO₂ compensado" value="3.4 t" delta="+0.2" deltaPositive icon={<Ic.mountain/>} accentColor="#818cf8"/>
        </div>

        {/* Benefits */}
        <SectionHeader label="Beneficios GOLD" action="Explorar" />
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 14px 4px', scrollSnapType: 'x mandatory' }}>
          <BenefitCard tag="EXCLUSIVO" tagColor="#d4b96a" title="Café de altura ─ Sierra Nevada" subtitle="30% dto. · Socios GOLD" />
          <BenefitCard tag="LIMITADO" tagColor="#34d399" title="Estadía eco-lodge" subtitle="2 noches · Minca" />
          <BenefitCard tag="NUEVO" tagColor="#818cf8" title="Kit de reforestación" subtitle="Planta 10 árboles" />
        </div>

        {/* Activity / ledger */}
        <SectionHeader label="Actividad reciente" action="Ver todo" />
        <div style={{ margin: '0 14px', background: 'var(--bg-card)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--e1)', overflow: 'hidden' }}>
          <LedgerRow icon={<Ic.leaf size={14}/>} iconColor="#34d399"
            title="Reforestación Sierra Nevada" subtitle="Hace 2 horas · Verificado" amount="+340 Airs" />
          <LedgerRow icon={<Ic.mountain size={14}/>} iconColor="var(--accent)"
            title="Compensación CO₂" subtitle="Ayer · 0.2 t" amount="+120 Airs" />
          <LedgerRow icon={<Ic.wallet size={14}/>} iconColor="#d4b96a"
            title="Redención · Café Sierra" subtitle="12 FEB · -$24.000 COP" amount="-80 Airs" amountPositive={false} last />
        </div>

        {/* Pills row — filter demo */}
        <SectionHeader label="Filtrar tokens" />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 4px' }}>
          <FilterPill label="Todos" active count={24} onPress={()=>{}} />
          <FilterPill label="Free" count={12} onPress={()=>{}} />
          <FilterPill label="Deposited" count={8} onPress={()=>{}} />
          <FilterPill label="Consumed" count={4} onPress={()=>{}} />
        </div>

        {/* Status pills showcase */}
        <SectionHeader label="Estado tier" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 14px' }}>
          <StatusPill status="BRONZE" />
          <StatusPill status="SILVER" />
          <StatusPill status="GOLD" />
          <StatusPill status="PLATINUM" />
        </div>

        {/* CTA */}
        <div style={{ padding: '22px 14px 8px', display: 'flex', gap: 10 }}>
          <Button title="Ver detalle" variant="secondary" fullWidth />
          <Button title="Compensar ahora" variant="primary" fullWidth icon={<Ic.leaf size={14}/>}/>
        </div>
      </div>

      <BottomTabBar active="home" />
    </div>
  );
}

Object.assign(window, { DashboardScreen, TopNavBar, BottomTabBar, SectionHeader, LedgerRow, QuickAction, BenefitCard });
