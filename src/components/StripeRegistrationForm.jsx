import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function StripeRegistrationForm({ user, onSuccess }) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: 登録, 2: 成功

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('すべての項目を入力してください');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return false;
    }
    
    if (!formData.agreeToTerms) {
      setError('利用規約に同意してください');
      return false;
    }
    
    return true;
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const functions = getFunctions();
      const registerStripeAccount = httpsCallable(functions, 'registerStripeAccount');
      
      const result = await registerStripeAccount({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userId: user.uid
      });
      
      if (result.data.success) {
        setStep(2);
      } else {
        setError(result.data.message || '登録に失敗しました');
      }
    } catch (error) {
      setError('登録エラー: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="stripe-registration-success">
        <h3>✅ Stripe登録完了</h3>
        <p>アカウントが正常に作成されました。</p>
        <p>続いて本人確認を行います。</p>
        <button 
          onClick={onSuccess}
          className="primary-button"
        >
          本人確認に進む
        </button>
      </div>
    );
  }

  return (
    <div className="stripe-registration-form">
      <h3>Stripe販売者アカウント登録</h3>
      <p>決済処理のためのStripeアカウントを作成します。</p>
      
      <form onSubmit={handleRegistration}>
        <div className="form-group">
          <label htmlFor="email">メールアドレス *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="firstName">名 *</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="太郎"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="lastName">姓 *</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="田中"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">パスワード *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="8文字以上のパスワード"
            minLength="8"
            required
          />
          <small>8文字以上の英数字を組み合わせてください</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">パスワード確認 *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="パスワードを再入力"
            required
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleInputChange}
              required
            />
            <span className="checkmark"></span>
            Stripeの利用規約に同意します
          </label>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          className="primary-button"
          disabled={loading}
        >
          {loading ? '登録中...' : 'Stripeアカウントを作成'}
        </button>
      </form>
    </div>
  );
}