import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as feather from 'feather-icons';

function ChangeCoverModal({ onClose, onUpdateCover }) {
  useEffect(() => {
    feather.replace();
  }, []);

  const gradientOptions = [
    {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      name: 'Default Shapes',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '5px', left: '5px', width: '15px', height: '15px', background: 'rgba(255,255,255,0.3)', transform: 'rotate(45deg)'}}></div>
          <div style={{position: 'absolute', top: '15px', right: '8px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.2)', transform: 'rotate(45deg)'}}></div>
          <div style={{position: 'absolute', bottom: '8px', left: '25px', width: '18px', height: '18px', background: 'rgba(255,255,255,0.25)', transform: 'rotate(45deg)'}}></div>
        </div>
      )
    },
    {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      name: 'Pink Circles',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '8px', left: '10px', width: '10px', height: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '50%'}}></div>
          <div style={{position: 'absolute', top: '20px', right: '15px', width: '6px', height: '6px', background: 'rgba(255,255,255,0.4)', borderRadius: '50%'}}></div>
          <div style={{position: 'absolute', bottom: '10px', left: '30px', width: '8px', height: '8px', background: 'rgba(255,255,255,0.35)', borderRadius: '50%'}}></div>
          <div style={{position: 'absolute', bottom: '25px', right: '8px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.25)', borderRadius: '50%'}}></div>
        </div>
      )
    },
    {
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      name: 'Ocean Triangles',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '10px', left: '8px', width: '0', height: '0', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '14px solid rgba(255,255,255,0.3)'}}></div>
          <div style={{position: 'absolute', top: '5px', right: '12px', width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '10px solid rgba(255,255,255,0.25)'}}></div>
          <div style={{position: 'absolute', bottom: '12px', left: '25px', width: '0', height: '0', borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '16px solid rgba(255,255,255,0.2)'}}></div>
        </div>
      )
    },
    {
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      name: 'Green Ovals',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '8px', left: '12px', width: '16px', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '50px'}}></div>
          <div style={{position: 'absolute', top: '20px', right: '10px', width: '20px', height: '6px', background: 'rgba(255,255,255,0.25)', borderRadius: '50px'}}></div>
          <div style={{position: 'absolute', bottom: '15px', left: '8px', width: '12px', height: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '50px'}}></div>
        </div>
      )
    },
    {
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      name: 'Sunset Squares',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '5px', left: '8px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.3)'}}></div>
          <div style={{position: 'absolute', top: '18px', right: '15px', width: '8px', height: '8px', background: 'rgba(255,255,255,0.35)'}}></div>
          <div style={{position: 'absolute', bottom: '10px', left: '28px', width: '10px', height: '10px', background: 'rgba(255,255,255,0.25)'}}></div>
          <div style={{position: 'absolute', bottom: '25px', right: '5px', width: '14px', height: '14px', background: 'rgba(255,255,255,0.2)'}}></div>
        </div>
      )
    },
    {
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      name: 'Soft Triangles',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '8px', left: '15px', width: '14px', height: '14px', background: 'rgba(255,255,255,0.25)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
          <div style={{position: 'absolute', top: '15px', right: '10px', width: '10px', height: '10px', background: 'rgba(255,255,255,0.3)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
          <div style={{position: 'absolute', bottom: '12px', left: '5px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.2)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
        </div>
      )
    },
    {
      gradient: 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
      name: 'Deep Geometric',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '6px', left: '8px', width: '16px', height: '16px', background: 'rgba(255,255,255,0.2)', transform: 'rotate(45deg)'}}></div>
          <div style={{position: 'absolute', top: '12px', right: '12px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%'}}></div>
          <div style={{position: 'absolute', bottom: '8px', left: '30px', width: '10px', height: '10px', background: 'rgba(255,255,255,0.25)'}}></div>
        </div>
      )
    },
    {
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
      name: 'Rose Mixed',
      preview: (
        <div style={{width: '100%', height: '50px', background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)', borderRadius: '6px', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '10px', left: '10px', width: '12px', height: '12px', background: 'rgba(255,255,255,0.3)', transform: 'rotate(45deg)'}}></div>
          <div style={{position: 'absolute', top: '5px', right: '8px', width: '8px', height: '8px', background: 'rgba(255,255,255,0.4)', borderRadius: '50%'}}></div>
          <div style={{position: 'absolute', bottom: '15px', left: '25px', width: '10px', height: '6px', background: 'rgba(255,255,255,0.25)', borderRadius: '50px'}}></div>
          <div style={{position: 'absolute', bottom: '8px', right: '15px', width: '6px', height: '6px', background: 'rgba(255,255,255,0.35)'}}></div>
        </div>
      )
    }
  ];

  const handleGradientClick = (gradient) => {
    onUpdateCover(gradient);
    onClose();
  };

  const handleCustomUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onUpdateCover(`url(${e.target.result})`);
          onClose();
        };
        reader.readAsDataURL(file);
      }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="change-cover-modal"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(5px)'
      }}
    >
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '18px' }}>
          Change Cover Background
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {gradientOptions.map((item, index) => (
            <button
              key={index}
              className="gradient-option"
              onClick={() => handleGradientClick(item.gradient)}
              style={{
                background: 'var(--card-background)',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {item.preview}
              <span style={{ fontSize: '12px', color: '#b0b0b0', fontWeight: 500 }}>
                {item.name}
              </span>
            </button>
          ))}
        </div>
        <button 
          onClick={handleCustomUpload}
          style={{
            width: '100%',
            padding: '12px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          Upload Custom Image
        </button>
        <button 
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--border-color)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

export default ChangeCoverModal;
