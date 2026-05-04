/* iOS device frame mockup · iPhone 12 Pro */

function IOSDevice({ width = 390, height = 820, dark = true, children }) {
  const bezel = 12;
  const notchW = 210, notchH = 28;
  const cornerR = 52;

  return (
    <div
      style={{
        position: 'relative',
        width: width + bezel * 2,
        height: height + bezel * 2,
        background: dark ? '#000' : '#f5f5f5',
        borderRadius: cornerR,
        padding: bezel,
        boxShadow: `0 20px 60px rgba(0,0,0,0.3), inset 0 0 0 1px ${
          dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }`,
        overflow: 'hidden',
      }}
    >
      {/* Screen */}
      <div
        style={{
          position: 'relative',
          width,
          height,
          background: '#fff',
          borderRadius: cornerR - bezel,
          overflow: 'hidden',
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: notchW,
            height: notchH,
            background: '#000',
            borderRadius: `0 0 ${notchH}px ${notchH}px`,
            zIndex: 10,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { IOSDevice });
