import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function SellerRegistration({ user, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    businessType: 'individual', // individual or company
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'JP'
    },
    birthDate: {
      day: '',
      month: '',
      year: ''
    },
    agreeToTerms: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validateForm = () => {
    const { firstName, lastName, phoneNumber, address, birthDate, agreeToTerms } = formData;
    
    if (!firstName || !lastName || !phoneNumber) {
      setError('氏名と電話番号を入力してください');
      return false;
    }
    
    if (!address.line1 || !address.city || !address.postalCode) {
      setError('住所を正しく入力してください');
      return false;
    }
    
    if (!birthDate.day || !birthDate.month || !birthDate.year) {
      setError('生年月日を入力してください');
      return false;
    }
    
    if (!agreeToTerms) {
      setError('利用規約に同意してください');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const functions = getFunctions();
      const createSellerAccount = httpsCallable(functions, 'createSellerAccount');
      
      const result = await createSellerAccount({
        userId: user.uid,
        email: formData.email,
        businessType: formData.businessType,
        individual: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phoneNumber,
          address: formData.address,
          dob: {
            day: parseInt(formData.birthDate.day),
            month: parseInt(formData.birthDate.month),
            year: parseInt(formData.birthDate.year)
          }
        }
      });
      
      if (result.data.success) {
        // 本人確認URLにリダイレクト
        if (result.data.onboardingUrl) {
          window.location.href = result.data.onboardingUrl;
        } else {
          onSuccess();
        }
      } else {
        setError(result.data.message || '登録に失敗しました');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('登録エラー: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seller-registration">
      <div className="registration-header">
        <h2>販売者登録</h2>
        <p>商品を販売するために必要な情報を入力してください</p>
      </div>
      
      <form onSubmit={handleSubmit} className="registration-form">
        {/* 事業形態 */}
        <div className="form-section">
          <h3>事業形態</h3>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="businessType"
                value="individual"
                checked={formData.businessType === 'individual'}
                onChange={handleInputChange}
              />
              個人
            </label>
            <label>
              <input
                type="radio"
                name="businessType"
                value="company"
                checked={formData.businessType === 'company'}
                onChange={handleInputChange}
              />
              法人
            </label>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="form-section">
          <h3>基本情報</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>姓 *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="田中"
                required
              />
            </div>
            
            <div className="form-group">
              <label>名 *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="太郎"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>メールアドレス *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled
            />
          </div>
          
          <div className="form-group">
            <label>電話番号 *</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="090-1234-5678"
              required
            />
          </div>
        </div>

        {/* 生年月日 */}
        <div className="form-section">
          <h3>生年月日 *</h3>
          <div className="birth-date-group">
            <select
              name="birthDate.year"
              value={formData.birthDate.year}
              onChange={handleInputChange}
              required
            >
              <option value="">年</option>
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <select
              name="birthDate.month"
              value={formData.birthDate.month}
              onChange={handleInputChange}
              required
            >
              <option value="">月</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            
            <select
              name="birthDate.day"
              value={formData.birthDate.day}
              onChange={handleInputChange}
              required
            >
              <option value="">日</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 住所 */}
        <div className="form-section">
          <h3>住所 *</h3>
          
          <div className="form-group">
            <label>郵便番号 *</label>
            <input
              type="text"
              name="address.postalCode"
              value={formData.address.postalCode}
              onChange={handleInputChange}
              placeholder="123-4567"
              required
            />
          </div>
          
          <div className="form-group">
            <label>都道府県 *</label>
            <input
              type="text"
              name="address.state"
              value={formData.address.state}
              onChange={handleInputChange}
              placeholder="東京都"
              required
            />
          </div>
          
          <div className="form-group">
            <label>市区町村 *</label>
            <input
              type="text"
              name="address.city"
              value={formData.address.city}
              onChange={handleInputChange}
              placeholder="渋谷区"
              required
            />
          </div>
          
          <div className="form-group">
            <label>番地・建物名 *</label>
            <input
              type="text"
              name="address.line1"
              value={formData.address.line1}
              onChange={handleInputChange}
              placeholder="渋谷1-1-1"
              required
            />
          </div>
          
          <div className="form-group">
            <label>建物名・部屋番号</label>
            <input
              type="text"
              name="address.line2"
              value={formData.address.line2}
              onChange={handleInputChange}
              placeholder="○○マンション101号室"
            />
          </div>
        </div>

        {/* 利用規約 */}
        <div className="form-section">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                required
              />
              <span className="checkmark"></span>
              <span>
                <a href="/terms" target="_blank">利用規約</a>と
                <a href="/privacy" target="_blank">プライバシーポリシー</a>に同意します
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            キャンセル
          </button>
          
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? '登録中...' : '販売者登録を申請'}
          </button>
        </div>
      </form>
      
      <div className="registration-info">
        <h4>ご注意</h4>
        <ul>
          <li>本人確認のため、身分証明書の提出が必要です</li>
          <li>審査には1-3営業日程度かかります</li>
          <li>販売手数料として売上の10%を頂いております</li>
          <li>売上金は月末締めの翌月末払いとなります</li>
        </ul>
      </div>
    </div>
  );
}