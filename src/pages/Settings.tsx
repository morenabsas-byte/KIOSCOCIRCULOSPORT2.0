import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Image, 
  Save, 
  Upload, 
  X, 
  Eye, 
  RotateCcw,
  Check,
  AlertTriangle
} from 'lucide-react';

interface BusinessConfig {
  businessName: string;
  logoUrl: string | null;
  logoFile: File | null;
}

const Settings: React.FC = () => {
  const [config, setConfig] = useState<BusinessConfig>({
    businessName: 'CIRCULO SPORT',
    logoUrl: null,
    logoFile: null
  });
  
  const [originalConfig, setOriginalConfig] = useState<BusinessConfig>({
    businessName: 'CIRCULO SPORT',
    logoUrl: null,
    logoFile: null
  });
  
  const [isLoading, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cargar configuración al iniciar
  useEffect(() => {
    loadBusinessConfig();
  }, []);

  // Limpiar URL de preview cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadBusinessConfig = () => {
    try {
      const savedConfig = localStorage.getItem('business-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        const loadedConfig = {
          businessName: parsed.businessName || 'CIRCULO SPORT',
          logoUrl: parsed.logoUrl || null,
          logoFile: null // No persistimos archivos, solo URLs
        };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
      }
    } catch (error) {
      console.error('Error loading business config:', error);
      showMessage('error', 'Error al cargar la configuración');
    }
  };

  const saveBusinessConfig = async () => {
    setSaving(true);
    try {
      let finalLogoUrl = config.logoUrl;
      
      // Si hay un archivo nuevo, convertirlo a base64
      if (config.logoFile) {
        finalLogoUrl = await fileToBase64(config.logoFile);
      }
      
      const configToSave = {
        businessName: config.businessName.trim(),
        logoUrl: finalLogoUrl,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('business-config', JSON.stringify(configToSave));
      
      // Actualizar el estado con la nueva configuración
      const newConfig = {
        businessName: configToSave.businessName,
        logoUrl: finalLogoUrl,
        logoFile: null
      };
      
      setConfig(newConfig);
      setOriginalConfig(newConfig);
      
      // Disparar evento personalizado para que otros componentes se actualicen
      window.dispatchEvent(new CustomEvent('businessConfigUpdated', { 
        detail: configToSave 
      }));
      
      showMessage('success', 'Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving business config:', error);
      showMessage('error', 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showMessage('error', 'El archivo es demasiado grande. Máximo 2MB permitido');
      return;
    }

    // Crear URL de preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);

    setConfig(prev => ({
      ...prev,
      logoFile: file
    }));
  };

  const removeLogo = () => {
    setConfig(prev => ({
      ...prev,
      logoUrl: null,
      logoFile: null
    }));
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Estás seguro de que quieres restaurar la configuración por defecto?')) {
      const defaultConfig = {
        businessName: 'CIRCULO SPORT',
        logoUrl: null,
        logoFile: null
      };
      
      setConfig(defaultConfig);
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const hasChanges = () => {
    return (
      config.businessName !== originalConfig.businessName ||
      config.logoFile !== null ||
      config.logoUrl !== originalConfig.logoUrl
    );
  };

  const getCurrentLogoUrl = () => {
    if (previewUrl) return previewUrl;
    if (config.logoUrl) return config.logoUrl;
    return null;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <SettingsIcon className="h-7 w-7 mr-3 text-blue-600" />
            Configuración del Negocio
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Personaliza el nombre y logo de tu negocio
          </p>
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="h-5 w-5 mr-2" />
            ) : (
              <AlertTriangle className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <div className="max-w-4xl">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Información del Negocio</h2>
            <p className="text-sm text-gray-500">Esta información aparecerá en toda la aplicación</p>
          </div>

          <div className="p-6 space-y-8">
            {/* Nombre del Negocio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 inline mr-2" />
                Nombre del Negocio
              </label>
              <input
                type="text"
                value={config.businessName}
                onChange={(e) => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa el nombre de tu negocio"
                maxLength={50}
              />
              <p className="mt-1 text-xs text-gray-500">
                Máximo 50 caracteres. Este nombre aparecerá en el header y recibos.
              </p>
            </div>

            {/* Logo del Negocio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                <Image className="h-4 w-4 inline mr-2" />
                Logo del Negocio
              </label>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Área de carga */}
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                      <span className="text-sm font-medium text-gray-900 mb-2">
                        Subir nuevo logo
                      </span>
                      <span className="text-xs text-gray-500">
                        JPG, PNG, GIF hasta 2MB
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 flex space-x-3">
                    {getCurrentLogoUrl() && (
                      <>
                        <button
                          onClick={() => setShowPreview(true)}
                          className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Vista Previa
                        </button>
                        <button
                          onClick={removeLogo}
                          className="flex items-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Quitar Logo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Preview del logo */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Vista Previa Actual</h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[200px] flex items-center justify-center">
                    {getCurrentLogoUrl() ? (
                      <img
                        src={getCurrentLogoUrl()!}
                        alt="Logo preview"
                        className="max-w-full max-h-[150px] object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Image className="h-16 w-16 mx-auto mb-2" />
                        <p className="text-sm">Sin logo configurado</p>
                        <p className="text-xs">Se usará el logo por defecto</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Recomendaciones para el logo:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Tamaño recomendado: 200x200 píxeles o mayor</li>
                  <li>• Formato: JPG, PNG o GIF</li>
                  <li>• Fondo transparente (PNG) para mejor integración</li>
                  <li>• Tamaño máximo: 2MB</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              onClick={resetToDefaults}
              className="flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Valores por Defecto
            </button>

            <div className="flex items-center space-x-3">
              {hasChanges() && (
                <span className="text-sm text-amber-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Tienes cambios sin guardar
                </span>
              )}
              
              <button
                onClick={saveBusinessConfig}
                disabled={isLoading || !hasChanges()}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de vista previa */}
      {showPreview && getCurrentLogoUrl() && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-75" onClick={() => setShowPreview(false)} />
          
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Vista Previa del Logo</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <img
                src={getCurrentLogoUrl()!}
                alt="Logo preview"
                className="max-w-full max-h-[400px] object-contain mx-auto"
              />
            </div>
            
            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                Así se verá tu logo en la aplicación
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;