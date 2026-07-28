# Frontend Integration Plan - Roles & Permissions System
# خطة دمج نظام الأدوار والصلاحيات في الفرونت إند

## 📋 نظرة عامة

خطة شاملة ومفصلة لدمج نظام الأدوار والصلاحيات الجديد في تطبيق Expenses-Wallet Frontend (Angular/Ionic).

**الهدف:** الاستفادة القصوى من النظام الجديد وتوفير تجربة مستخدم ممتازة مع أمان كامل.

---

## 📊 التقدم الإجمالي: 0% (0/12 مكتمل)

---

## 🎯 الأهداف الرئيسية

1. ✅ **Security First**: حماية كاملة للواجهات والميزات
2. ✅ **User Experience**: تجربة سلسة مع رسائل واضحة
3. ✅ **Performance**: تحميل سريع مع caching ذكي
4. ✅ **Scalability**: بنية قابلة للتوسع
5. ✅ **Maintainability**: كود نظيف وسهل الصيانة

---

## 🏗️ البنية المقترحة

```
src/app/
├── core/
│   ├── guards/
│   │   ├── permission.guard.ts          # حماية الـ routes
│   │   ├── plan.guard.ts                # فحص الخطة
│   │   └── role.guard.ts                # فحص الدور
│   ├── services/
│   │   ├── permission.service.ts        # إدارة الصلاحيات
│   │   ├── plan.service.ts              # إدارة الخطط
│   │   └── cache.service.ts             # Cache للصلاحيات
│   ├── interceptors/
│   │   ├── permission-error.interceptor.ts  # معالجة أخطاء الصلاحيات
│   │   └── rate-limit.interceptor.ts    # معالجة Rate Limiting
│   └── models/
│       ├── permission.model.ts          # نماذج الصلاحيات
│       ├── plan.model.ts                # نماذج الخطط
│       └── user.model.ts                # تحديث نموذج المستخدم
├── shared/
│   ├── directives/
│   │   ├── has-permission.directive.ts  # إخفاء/إظهار حسب الصلاحية
│   │   ├── has-plan.directive.ts        # إخفاء/إظهار حسب الخطة
│   │   └── disable-if-no-permission.directive.ts  # تعطيل الأزرار
│   ├── components/
│   │   ├── upgrade-prompt/              # مطالبة بالترقية
│   │   ├── permission-denied/           # رسالة رفض الوصول
│   │   ├── plan-badge/                  # شارة الخطة
│   │   └── feature-lock/                # قفل الميزة
│   └── pipes/
│       ├── permission-name.pipe.ts      # عرض اسم الصلاحية
│       └── plan-name.pipe.ts            # عرض اسم الخطة
├── features/
│   ├── plans/                           # صفحات الخطط
│   │   ├── plan-list/
│   │   ├── plan-details/
│   │   └── plan-comparison/
│   ├── admin/                           # لوحة الإدارة
│   │   ├── permission-matrix/
│   │   ├── user-management/
│   │   └── audit-logs/
│   └── profile/
│       └── my-permissions/              # صفحة صلاحياتي
└── constants/
    ├── permissions.constants.ts         # ثوابت الصلاحيات
    ├── plans.constants.ts               # ثوابت الخطط
    └── error-messages.constants.ts      # رسائل الأخطاء
```

---

## 📝 الخطوات التفصيلية

### ⏳ الخطوة 1: إعداد البنية الأساسية (Foundation Setup)

**المدة المتوقعة:** 4-6 ساعات

#### 1.1 إنشاء Models و Types

**الملفات:**
- `src/app/core/models/permission.model.ts`
- `src/app/core/models/plan.model.ts`
- `src/app/core/models/role.model.ts`
- `src/app/core/models/user.model.ts` (تحديث)

**المحتوى:**

```typescript
// permission.model.ts
export enum Permission {
  // Categories
  CATEGORY_CREATE = 'category:create',
  CATEGORY_READ = 'category:read',
  CATEGORY_UPDATE = 'category:update',
  CATEGORY_DELETE = 'category:delete',
  
  // Expenses
  EXPENSE_CREATE = 'expense:create',
  EXPENSE_READ = 'expense:read',
  EXPENSE_UPDATE = 'expense:update',
  EXPENSE_DELETE = 'expense:delete',
  EXPENSE_EXPORT = 'expense:export',
  
  // Reports
  REPORT_VIEW = 'report:view',
  REPORT_ADVANCED = 'report:advanced',
  
  // Backup & Sync
  BACKUP_LOCAL = 'backup:local',
  BACKUP_GDRIVE = 'backup:gdrive',
  SYNC_MULTI_DEVICE = 'sync:multi_device',
  
  // Profile
  PROFILE_UPDATE = 'profile:update',
  PROFILE_AVATAR = 'profile:avatar',
  
  // Support
  SUPPORT_PRIORITY = 'support:priority',
  
  // Security
  SECURITY_ADVANCED_ENCRYPTION = 'security:advanced_encryption',
  SECURITY_BIOMETRIC = 'security:biometric',
  
  // Admin
  ADMIN_DASHBOARD = 'admin:dashboard',
  ADMIN_USERS = 'admin:users',
  ADMIN_CATEGORIES = 'admin:categories',
  ADMIN_EXPENSES = 'admin:expenses',
  ADMIN_SYNC = 'admin:sync',
  ADMIN_HEALTH = 'admin:health',
  ADMIN_PLANS = 'admin:plans'
}

export interface PermissionScope {
  scope: string;
  permissions: Permission[];
}

// plan.model.ts
export enum PlanSlug {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface Plan {
  _id: string;
  name: string;
  slug: PlanSlug;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  limits: PlanLimits;
  features: Permission[];
  isActive: boolean;
  isPopular: boolean;
  order: number;
}

export interface PlanLimits {
  maxCategories: number | null;
  maxTransactionsPerMonth: number | null;
  maxBackupFiles: number | null;
  maxDevices: number | null;
}

// role.model.ts
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin'
}

// user.model.ts (تحديث)
export interface User {
  _id: string;
  email: string;
  username?: string;
  fullName?: string;
  image?: string;
  role: UserRole;
  plan: PlanSlug;
  planExpiresAt?: Date | null;
  planStartedAt?: Date | null;
  customPermissions: Permission[];
  permissions?: Permission[]; // Computed permissions
  emailVerified: boolean;
  isActive: boolean;
}
```

#### 1.2 إنشاء Constants

**الملف:** `src/app/constants/permissions.constants.ts`

```typescript
import { Permission } from '../core/models/permission.model';

export const PERMISSION_GROUPS = {
  categories: {
    label: 'Categories',
    labelAr: 'الفئات',
    permissions: [
      Permission.CATEGORY_CREATE,
      Permission.CATEGORY_READ,
      Permission.CATEGORY_UPDATE,
      Permission.CATEGORY_DELETE
    ]
  },
  expenses: {
    label: 'Expenses',
    labelAr: 'المصروفات',
    permissions: [
      Permission.EXPENSE_CREATE,
      Permission.EXPENSE_READ,
      Permission.EXPENSE_UPDATE,
      Permission.EXPENSE_DELETE,
      Permission.EXPENSE_EXPORT
    ]
  },
  // ... المزيد
};

export const PERMISSION_LABELS: Record<Permission, { en: string; ar: string }> = {
  [Permission.CATEGORY_CREATE]: {
    en: 'Create Categories',
    ar: 'إنشاء الفئات'
  },
  [Permission.EXPENSE_EXPORT]: {
    en: 'Export Expenses',
    ar: 'تصدير المصروفات'
  },
  // ... المزيد
};
```

**الملف:** `src/app/constants/plans.constants.ts`

```typescript
import { PlanSlug } from '../core/models/plan.model';

export const PLAN_COLORS: Record<PlanSlug, string> = {
  [PlanSlug.FREE]: '#6c757d',
  [PlanSlug.BASIC]: '#0d6efd',
  [PlanSlug.PRO]: '#6f42c1',
  [PlanSlug.ENTERPRISE]: '#d63384'
};

export const PLAN_ICONS: Record<PlanSlug, string> = {
  [PlanSlug.FREE]: 'gift-outline',
  [PlanSlug.BASIC]: 'star-outline',
  [PlanSlug.PRO]: 'rocket-outline',
  [PlanSlug.ENTERPRISE]: 'business-outline'
};
```

---

### ⏳ الخطوة 2: Permission Service (خدمة الصلاحيات)

**المدة المتوقعة:** 6-8 ساعات

**الملف:** `src/app/core/services/permission.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Permission } from '../models/permission.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);
  public permissions$ = this.permissionsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cache: CacheService
  ) {}

  /**
   * Load user permissions from backend
   */
  loadUserPermissions(): Observable<Permission[]> {
    // Check cache first
    const cached = this.cache.get<Permission[]>('user-permissions');
    if (cached) {
      this.permissionsSubject.next(cached);
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    return this.http.get<{ success: boolean; data: { permissions: Permission[] } }>(
      '/v1/scopes/me'
    ).pipe(
      map(response => response.data.permissions),
      tap(permissions => {
        this.cache.set('user-permissions', permissions, 5 * 60 * 1000); // 5 min
        this.permissionsSubject.next(permissions);
      })
    );
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: Permission): boolean {
    const permissions = this.permissionsSubject.value;
    return permissions.includes(permission);
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(requiredPermissions: Permission[]): boolean {
    const permissions = this.permissionsSubject.value;
    return requiredPermissions.every(p => permissions.includes(p));
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(requiredPermissions: Permission[]): boolean {
    const permissions = this.permissionsSubject.value;
    return requiredPermissions.some(p => permissions.includes(p));
  }

  /**
   * Check permission via API (for critical operations)
   */
  checkPermissionAPI(permission: Permission): Observable<boolean> {
    return this.http.get<{ success: boolean; data: { hasScope: boolean } }>(
      `/v1/scopes/check/${permission}`
    ).pipe(
      map(response => response.data.hasScope)
    );
  }

  /**
   * Get missing permissions
   */
  getMissingPermissions(requiredPermissions: Permission[]): Observable<Permission[]> {
    return this.http.post<{ success: boolean; data: { missingPermissions: Permission[] } }>(
      '/v1/scopes/missing',
      { requiredScopes: requiredPermissions }
    ).pipe(
      map(response => response.data.missingPermissions)
    );
  }

  /**
   * Clear permissions cache
   */
  clearCache(): void {
    this.cache.remove('user-permissions');
    this.permissionsSubject.next([]);
  }

  /**
   * Get current permissions
   */
  getCurrentPermissions(): Permission[] {
    return this.permissionsSubject.value;
  }
}
```

---

### ⏳ الخطوة 3: Plan Service (خدمة الخطط)

**المدة المتوقعة:** 4-6 ساعات

**الملف:** `src/app/core/services/plan.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Plan, PlanSlug } from '../models/plan.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private currentPlanSubject = new BehaviorSubject<Plan | null>(null);
  public currentPlan$ = this.currentPlanSubject.asObservable();

  private plansSubject = new BehaviorSubject<Plan[]>([]);
  public plans$ = this.plansSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load all available plans
   */
  loadPlans(): Observable<Plan[]> {
    return this.http.get<{ success: boolean; data: Plan[] }>('/v1/plans').pipe(
      map(response => response.data),
      tap(plans => this.plansSubject.next(plans))
    );
  }

  /**
   * Load current user plan
   */
  loadCurrentPlan(user: User): Observable<Plan> {
    return this.http.get<{ success: boolean; data: Plan }>(
      `/v1/plans/${user.plan}`
    ).pipe(
      map(response => response.data),
      tap(plan => this.currentPlanSubject.next(plan))
    );
  }

  /**
   * Check if user has active plan
   */
  hasActivePlan(user: User): boolean {
    if (!user.planExpiresAt) return true; // Lifetime or free
    return new Date(user.planExpiresAt) > new Date();
  }

  /**
   * Get days remaining in plan
   */
  getDaysRemaining(user: User): number | null {
    if (!user.planExpiresAt) return null;
    const now = new Date();
    const expiry = new Date(user.planExpiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if plan is expiring soon (< 7 days)
   */
  isPlanExpiringSoon(user: User): boolean {
    const days = this.getDaysRemaining(user);
    return days !== null && days > 0 && days <= 7;
  }

  /**
   * Compare two plans
   */
  comparePlans(plan1: PlanSlug, plan2: PlanSlug): Observable<any> {
    return this.http.get(
      `/v1/permissions/compare/plans?plan1=${plan1}&plan2=${plan2}`
    );
  }

  /**
   * Get upgrade URL
   */
  getUpgradeUrl(targetPlan: PlanSlug, feature?: string): string {
    let url = `/plans/upgrade?plan=${targetPlan}`;
    if (feature) {
      url += `&feature=${feature}`;
    }
    return url;
  }

  /**
   * Check if user can perform action based on limits
   */
  canPerformAction(
    user: User,
    limitType: 'maxCategories' | 'maxTransactionsPerMonth' | 'maxBackupFiles' | 'maxDevices',
    currentCount: number
  ): boolean {
    const plan = this.currentPlanSubject.value;
    if (!plan) return false;

    const limit = plan.limits[limitType];
    if (limit === null) return true; // Unlimited
    return currentCount < limit;
  }
}
```

---

### ⏳ الخطوة 4: Guards (حماية الـ Routes)

**المدة المتوقعة:** 4-6 ساعات

**الملف:** `src/app/core/guards/permission.guard.ts`

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../models/permission.model';
import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private router: Router,
    private toast: ToastService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> | boolean {
    const requiredPermission = route.data['permission'] as Permission;
    const requiredPermissions = route.data['permissions'] as Permission[];

    if (requiredPermission) {
      return this.checkPermission(requiredPermission);
    }

    if (requiredPermissions) {
      return this.checkPermissions(requiredPermissions);
    }

    return true;
  }

  private checkPermission(permission: Permission): Observable<boolean> {
    return this.permissionService.checkPermissionAPI(permission).pipe(
      map(hasPermission => {
        if (!hasPermission) {
          this.handleDenied(permission);
        }
        return hasPermission;
      })
    );
  }

  private checkPermissions(permissions: Permission[]): boolean {
    const hasAll = this.permissionService.hasAllPermissions(permissions);
    if (!hasAll) {
      this.handleDenied(permissions[0]);
    }
    return hasAll;
  }

  private handleDenied(permission: Permission): void {
    this.toast.error('You don\'t have permission to access this feature');
    this.router.navigate(['/permission-denied'], {
      queryParams: { permission }
    });
  }
}
```

**الملف:** `src/app/core/guards/plan.guard.ts`

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PlanService } from '../services/plan.service';
import { AuthService } from '../services/auth.service';
import { PlanSlug } from '../models/plan.model';

@Injectable({
  providedIn: 'root'
})
export class PlanGuard implements CanActivate {
  constructor(
    private planService: PlanService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPlan = route.data['requiredPlan'] as PlanSlug;
    const user = this.authService.currentUserValue;

    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    // Check if user has required plan or higher
    const planOrder = {
      [PlanSlug.FREE]: 0,
      [PlanSlug.BASIC]: 1,
      [PlanSlug.PRO]: 2,
      [PlanSlug.ENTERPRISE]: 3
    };

    const hasRequiredPlan = planOrder[user.plan] >= planOrder[requiredPlan];

    if (!hasRequiredPlan) {
      this.router.navigate(['/plans/upgrade'], {
        queryParams: { required: requiredPlan }
      });
      return false;
    }

    // Check if plan is active
    if (!this.planService.hasActivePlan(user)) {
      this.router.navigate(['/plans/renew']);
      return false;
    }

    return true;
  }
}
```

---

### ⏳ الخطوة 5: Directives (توجيهات العرض)

**المدة المتوقعة:** 4-6 ساعات

**الملف:** `src/app/shared/directives/has-permission.directive.ts`

```typescript
import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PermissionService } from '../../core/services/permission.service';
import { Permission } from '../../core/models/permission.model';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  @Input() appHasPermission!: Permission | Permission[];
  @Input() appHasPermissionMode: 'all' | 'any' = 'all';

  private destroy$ = new Subject<void>();

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.permissionService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  private updateView(): void {
    const hasPermission = this.checkPermission();
    
    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  private checkPermission(): boolean {
    if (Array.isArray(this.appHasPermission)) {
      return this.appHasPermissionMode === 'all'
        ? this.permissionService.hasAllPermissions(this.appHasPermission)
        : this.permissionService.hasAnyPermission(this.appHasPermission);
    }
    return this.permissionService.hasPermission(this.appHasPermission);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**الاستخدام:**
```html
<!-- إخفاء زر التصدير إذا لم يكن لديه صلاحية -->
<ion-button *appHasPermission="Permission.EXPENSE_EXPORT">
  Export
</ion-button>

<!-- إخفاء إذا لم يكن لديه أي من الصلاحيات -->
<div *appHasPermission="[Permission.ADMIN_USERS, Permission.ADMIN_DASHBOARD]; mode: 'any'">
  Admin Panel
</div>
```

**الملف:** `src/app/shared/directives/disable-if-no-permission.directive.ts`

```typescript
import { Directive, Input, ElementRef, Renderer2, OnInit } from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';
import { Permission } from '../../core/models/permission.model';

@Directive({
  selector: '[appDisableIfNoPermission]',
  standalone: true
})
export class DisableIfNoPermissionDirective implements OnInit {
  @Input() appDisableIfNoPermission!: Permission;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    const hasPermission = this.permissionService.hasPermission(
      this.appDisableIfNoPermission
    );

    if (!hasPermission) {
      this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
      this.renderer.addClass(this.el.nativeElement, 'permission-disabled');
    }
  }
}
```

---

### ⏳ الخطوة 6: Interceptors (معالجة الأخطاء)

**المدة المتوقعة:** 3-4 ساعات

**الملف:** `src/app/core/interceptors/permission-error.interceptor.ts`

```typescript
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { ModalController } from '@ionic/angular';
import { UpgradePromptComponent } from '../../shared/components/upgrade-prompt/upgrade-prompt.component';

@Injectable()
export class PermissionErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private toast: ToastService,
    private modalCtrl: ModalController
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 403) {
          this.handlePermissionError(error);
        } else if (error.status === 429) {
          this.handleRateLimitError(error);
        }
        return throwError(() => error);
      })
    );
  }

  private async handlePermissionError(error: HttpErrorResponse): Promise<void> {
    const errorData = error.error;

    // Check if it's a plan-related error
    if (errorData.error === 'PLAN_REQUIRED' || errorData.error === 'PLAN_EXPIRED') {
      await this.showUpgradePrompt(errorData);
    } else {
      // Generic permission denied
      this.toast.error(
        errorData.message || 'You don\'t have permission to perform this action'
      );
    }
  }

  private async showUpgradePrompt(errorData: any): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UpgradePromptComponent,
      componentProps: {
        message: errorData.message,
        suggestion: errorData.suggestion,
        requiredPlan: errorData.requiredPlan,
        upgradeUrl: errorData.upgradeUrl
      }
    });
    await modal.present();
  }

  private handleRateLimitError(error: HttpErrorResponse): void {
    const errorData = error.error;
    const retryAfter = errorData.retryAfter || 60;
    
    this.toast.error(
      `Too many requests. Please try again in ${retryAfter} seconds.`,
      5000
    );
  }
}
```

---

### ⏳ الخطوة 7: Shared Components (المكونات المشتركة)

**المدة المتوقعة:** 8-10 ساعات

#### 7.1 Upgrade Prompt Component

**الملف:** `src/app/shared/components/upgrade-prompt/upgrade-prompt.component.ts`

```typescript
import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { PlanSlug } from '../../../core/models/plan.model';

@Component({
  selector: 'app-upgrade-prompt',
  templateUrl: './upgrade-prompt.component.html',
  styleUrls: ['./upgrade-prompt.component.scss'],
  standalone: true
})
export class UpgradePromptComponent {
  @Input() message!: string;
  @Input() suggestion!: string;
  @Input() requiredPlan!: PlanSlug;
  @Input() upgradeUrl!: string;

  constructor(
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  dismiss(): void {
    this.modalCtrl.dismiss();
  }

  async upgrade(): Promise<void> {
    await this.modalCtrl.dismiss();
    this.router.navigateByUrl(this.upgradeUrl);
  }
}
```

**الملف:** `src/app/shared/components/upgrade-prompt/upgrade-prompt.component.html`

```html
<ion-header>
  <ion-toolbar>
    <ion-title>Upgrade Required</ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="dismiss()">
        <ion-icon name="close"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content class="ion-padding">
  <div class="upgrade-prompt">
    <div class="icon-container">
      <ion-icon name="lock-closed" color="warning"></ion-icon>
    </div>
    
    <h2>{{ message }}</h2>
    <p class="suggestion">{{ suggestion }}</p>
    
    <div class="plan-badge">
      <ion-chip color="primary">
        <ion-icon name="star"></ion-icon>
        <ion-label>{{ requiredPlan | uppercase }} Plan Required</ion-label>
      </ion-chip>
    </div>
    
    <div class="actions">
      <ion-button expand="block" (click)="upgrade()">
        Upgrade Now
      </ion-button>
      <ion-button expand="block" fill="clear" (click)="dismiss()">
        Maybe Later
      </ion-button>
    </div>
  </div>
</ion-content>
```

#### 7.2 Plan Badge Component

**الملف:** `src/app/shared/components/plan-badge/plan-badge.component.ts`

```typescript
import { Component, Input } from '@angular/core';
import { PlanSlug } from '../../../core/models/plan.model';
import { PLAN_COLORS, PLAN_ICONS } from '../../../constants/plans.constants';

@Component({
  selector: 'app-plan-badge',
  templateUrl: './plan-badge.component.html',
  styleUrls: ['./plan-badge.component.scss'],
  standalone: true
})
export class PlanBadgeComponent {
  @Input() plan!: PlanSlug;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  get color(): string {
    return PLAN_COLORS[this.plan];
  }

  get icon(): string {
    return PLAN_ICONS[this.plan];
  }

  get label(): string {
    return this.plan.toUpperCase();
  }
}
```

#### 7.3 Feature Lock Component

**الملف:** `src/app/shared/components/feature-lock/feature-lock.component.ts`

```typescript
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Permission } from '../../../core/models/permission.model';
import { PlanSlug } from '../../../core/models/plan.model';

@Component({
  selector: 'app-feature-lock',
  templateUrl: './feature-lock.component.html',
  styleUrls: ['./feature-lock.component.scss'],
  standalone: true
})
export class FeatureLockComponent {
  @Input() feature!: string;
  @Input() requiredPermission!: Permission;
  @Input() requiredPlan!: PlanSlug;
  @Input() description!: string;

  constructor(private router: Router) {}

  upgrade(): void {
    this.router.navigate(['/plans/upgrade'], {
      queryParams: {
        plan: this.requiredPlan,
        feature: this.feature
      }
    });
  }
}
```

**HTML:**
```html
<div class="feature-lock">
  <div class="lock-icon">
    <ion-icon name="lock-closed"></ion-icon>
  </div>
  <h3>{{ feature }}</h3>
  <p>{{ description }}</p>
  <ion-chip color="primary">
    <ion-label>{{ requiredPlan | uppercase }} Plan</ion-label>
  </ion-chip>
  <ion-button expand="block" (click)="upgrade()">
    Unlock Feature
  </ion-button>
</div>
```

---

### ⏳ الخطوة 8: Admin Dashboard (لوحة الإدارة)

**المدة المتوقعة:** 12-16 ساعات

#### 8.1 Permission Matrix Page

**الملف:** `src/app/features/admin/permission-matrix/permission-matrix.page.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-permission-matrix',
  templateUrl: './permission-matrix.page.html',
  styleUrls: ['./permission-matrix.page.scss']
})
export class PermissionMatrixPage implements OnInit {
  matrix: any = null;
  loading = false;
  viewMode: 'table' | 'chart' = 'table';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMatrix();
  }

  async loadMatrix(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.http.get<any>('/v1/permissions/matrix').toPromise();
      this.matrix = response.data;
    } catch (error) {
      console.error('Failed to load matrix:', error);
    } finally {
      this.loading = false;
    }
  }

  async exportMatrix(format: 'json' | 'csv' | 'markdown'): Promise<void> {
    const response = await this.http.get(
      `/v1/permissions/export?format=${format}`,
      { responseType: 'blob' }
    ).toPromise();

    // Download file
    const url = window.URL.createObjectURL(response);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-matrix.${format}`;
    a.click();
  }
}
```

#### 8.2 User Management Page

**الملف:** `src/app/features/admin/user-management/user-management.page.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../../core/models/user.model';
import { PlanSlug } from '../../../core/models/plan.model';
import { UserRole } from '../../../core/models/role.model';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.page.html',
  styleUrls: ['./user-management.page.scss']
})
export class UserManagementPage implements OnInit {
  users: User[] = [];
  loading = false;
  searchTerm = '';
  filterRole: UserRole | 'all' = 'all';
  filterPlan: PlanSlug | 'all' = 'all';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.http.get<any>('/v1/admin/users').toPromise();
      this.users = response.data;
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      this.loading = false;
    }
  }

  async changeUserRole(userId: string, newRole: UserRole): Promise<void> {
    try {
      await this.http.patch(`/v1/admin/users/${userId}/role`, {
        role: newRole
      }).toPromise();
      
      await this.loadUsers();
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  }

  async changeUserPlan(userId: string, newPlan: PlanSlug): Promise<void> {
    try {
      await this.http.patch(`/v1/admin/users/${userId}/plan`, {
        plan: newPlan
      }).toPromise();
      
      await this.loadUsers();
    } catch (error) {
      console.error('Failed to change plan:', error);
    }
  }

  get filteredUsers(): User[] {
    return this.users.filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (user.fullName?.toLowerCase().includes(this.searchTerm.toLowerCase()));
      const matchesRole = this.filterRole === 'all' || user.role === this.filterRole;
      const matchesPlan = this.filterPlan === 'all' || user.plan === this.filterPlan;
      
      return matchesSearch && matchesRole && matchesPlan;
    });
  }
}
```

#### 8.3 Audit Logs Page

**الملف:** `src/app/features/admin/audit-logs/audit-logs.page.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface AuditLog {
  _id: string;
  action: string;
  actorId: string;
  targetUserId?: string;
  severity: string;
  success: boolean;
  metadata: any;
  ipAddress: string;
  createdAt: Date;
}

@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.page.html',
  styleUrls: ['./audit-logs.page.scss']
})
export class AuditLogsPage implements OnInit {
  logs: AuditLog[] = [];
  loading = false;
  filterAction = '';
  filterSeverity = '';
  startDate: string = '';
  endDate: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  async loadLogs(): Promise<void> {
    this.loading = true;
    try {
      let url = '/v1/audit-logs?limit=100';
      
      if (this.filterAction) url += `&action=${this.filterAction}`;
      if (this.filterSeverity) url += `&severity=${this.filterSeverity}`;
      if (this.startDate) url += `&startDate=${this.startDate}`;
      if (this.endDate) url += `&endDate=${this.endDate}`;

      const response = await this.http.get<any>(url).toPromise();
      this.logs = response.data.logs;
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      this.loading = false;
    }
  }

  getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      'INFO': 'primary',
      'WARNING': 'warning',
      'ERROR': 'danger',
      'CRITICAL': 'danger'
    };
    return colors[severity] || 'medium';
  }
}
```

---

### ⏳ الخطوة 9: Plans Pages (صفحات الخطط)

**المدة المتوقعة:** 10-12 ساعات

#### 9.1 Plan List Page

**الملف:** `src/app/features/plans/plan-list/plan-list.page.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { PlanService } from '../../../core/services/plan.service';
import { Plan, PlanSlug } from '../../../core/models/plan.model';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-plan-list',
  templateUrl: './plan-list.page.html',
  styleUrls: ['./plan-list.page.scss']
})
export class PlanListPage implements OnInit {
  plans: Plan[] = [];
  currentPlan: Plan | null = null;
  loading = false;

  constructor(
    private planService: PlanService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  async loadPlans(): Promise<void> {
    this.loading = true;
    try {
      this.plans = await this.planService.loadPlans().toPromise() || [];
      
      const user = this.authService.currentUserValue;
      if (user) {
        this.currentPlan = await this.planService.loadCurrentPlan(user).toPromise() || null;
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      this.loading = false;
    }
  }

  isCurrentPlan(plan: Plan): boolean {
    return this.currentPlan?.slug === plan.slug;
  }

  selectPlan(plan: Plan): void {
    if (this.isCurrentPlan(plan)) return;
    
    this.router.navigate(['/plans/upgrade'], {
      queryParams: { plan: plan.slug }
    });
  }

  comparePlans(plan1: Plan, plan2: Plan): void {
    this.router.navigate(['/plans/compare'], {
      queryParams: {
        plan1: plan1.slug,
        plan2: plan2.slug
      }
    });
  }
}
```

**HTML Template:**
```html
<ion-header>
  <ion-toolbar>
    <ion-title>Choose Your Plan</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="plans-container">
    <ion-card *ngFor="let plan of plans" 
              [class.popular]="plan.isPopular"
              [class.current]="isCurrentPlan(plan)">
      
      <ion-card-header>
        <div class="plan-badge">
          <app-plan-badge [plan]="plan.slug"></app-plan-badge>
          <ion-badge *ngIf="plan.isPopular" color="warning">Popular</ion-badge>
          <ion-badge *ngIf="isCurrentPlan(plan)" color="success">Current</ion-badge>
        </div>
        
        <ion-card-title>{{ plan.name }}</ion-card-title>
        <ion-card-subtitle>{{ plan.description }}</ion-card-subtitle>
      </ion-card-header>

      <ion-card-content>
        <div class="price">
          <span class="amount">{{ plan.price === 0 ? 'Free' : '$' + plan.price }}</span>
          <span class="period" *ngIf="plan.price > 0">/{{ plan.billingCycle }}</span>
        </div>

        <ion-list>
          <ion-item *ngFor="let feature of plan.features" lines="none">
            <ion-icon name="checkmark-circle" color="success" slot="start"></ion-icon>
            <ion-label>{{ feature | permissionName }}</ion-label>
          </ion-item>
        </ion-list>

        <ion-button expand="block" 
                    [disabled]="isCurrentPlan(plan)"
                    (click)="selectPlan(plan)">
          {{ isCurrentPlan(plan) ? 'Current Plan' : 'Select Plan' }}
        </ion-button>
      </ion-card-content>
    </ion-card>
  </div>
</ion-content>
```

---

### ⏳ الخطوة 10: Profile & Permissions Page

**المدة المتوقعة:** 4-6 ساعات

**الملف:** `src/app/features/profile/my-permissions/my-permissions.page.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { PermissionService } from '../../../core/services/permission.service';
import { PlanService } from '../../../core/services/plan.service';
import { AuthService } from '../../../core/services/auth.service';
import { Permission } from '../../../core/models/permission.model';
import { Plan } from '../../../core/models/plan.model';
import { PERMISSION_GROUPS } from '../../../constants/permissions.constants';

@Component({
  selector: 'app-my-permissions',
  templateUrl: './my-permissions.page.html',
  styleUrls: ['./my-permissions.page.scss']
})
export class MyPermissionsPage implements OnInit {
  permissions: Permission[] = [];
  currentPlan: Plan | null = null;
  permissionGroups = PERMISSION_GROUPS;
  loading = false;

  constructor(
    private permissionService: PermissionService,
    private planService: PlanService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      this.permissions = await this.permissionService.loadUserPermissions().toPromise() || [];
      
      const user = this.authService.currentUserValue;
      if (user) {
        this.currentPlan = await this.planService.loadCurrentPlan(user).toPromise() || null;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      this.loading = false;
    }
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  getGroupPermissions(groupKey: string): any[] {
    const group = this.permissionGroups[groupKey];
    return group.permissions.map(p => ({
      permission: p,
      hasPermission: this.hasPermission(p)
    }));
  }
}
```

---

### ⏳ الخطوة 11: Update Existing Pages

**المدة المتوقعة:** 8-12 ساعات

#### تحديث صفحة Categories

```typescript
// categories.page.ts
import { Permission } from '../../core/models/permission.model';
import { PermissionService } from '../../core/services/permission.service';

export class CategoriesPage implements OnInit {
  canCreate = false;
  canEdit = false;
  canDelete = false;

  constructor(
    private permissionService: PermissionService,
    // ... other services
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
    this.loadCategories();
  }

  checkPermissions(): void {
    this.canCreate = this.permissionService.hasPermission(Permission.CATEGORY_CREATE);
    this.canEdit = this.permissionService.hasPermission(Permission.CATEGORY_UPDATE);
    this.canDelete = this.permissionService.hasPermission(Permission.CATEGORY_DELETE);
  }

  async addCategory(): Promise<void> {
    if (!this.canCreate) {
      // Show upgrade prompt
      return;
    }
    // ... existing code
  }
}
```

```html
<!-- categories.page.html -->
<ion-fab vertical="bottom" horizontal="end" 
         *appHasPermission="Permission.CATEGORY_CREATE">
  <ion-fab-button (click)="addCategory()">
    <ion-icon name="add"></ion-icon>
  </ion-fab-button>
</ion-fab>

<ion-item-sliding *ngFor="let category of categories">
  <ion-item>
    <ion-label>{{ category.name }}</ion-label>
  </ion-item>
  
  <ion-item-options side="end">
    <ion-item-option color="primary" 
                     *appHasPermission="Permission.CATEGORY_UPDATE"
                     (click)="editCategory(category)">
      Edit
    </ion-item-option>
    <ion-item-option color="danger" 
                     *appHasPermission="Permission.CATEGORY_DELETE"
                     (click)="deleteCategory(category)">
      Delete
    </ion-item-option>
  </ion-item-options>
</ion-item-sliding>
```

#### تحديث صفحة Expenses

```typescript
// expenses.page.ts
async exportExpenses(): Promise<void> {
  const hasPermission = this.permissionService.hasPermission(Permission.EXPENSE_EXPORT);
  
  if (!hasPermission) {
    // Show upgrade prompt for Pro plan
    const modal = await this.modalCtrl.create({
      component: UpgradePromptComponent,
      componentProps: {
        message: 'Export feature requires Pro Plan',
        suggestion: 'Upgrade to Pro to export your expenses',
        requiredPlan: PlanSlug.PRO,
        upgradeUrl: '/plans/upgrade?plan=pro&feature=export'
      }
    });
    await modal.present();
    return;
  }

  // Proceed with export
  // ... existing code
}
```

---

### ⏳ الخطوة 12: Testing & Optimization

**المدة المتوقعة:** 6-8 ساعات

#### Unit Tests

```typescript
// permission.service.spec.ts
describe('PermissionService', () => {
  let service: PermissionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PermissionService, CacheService]
    });
    service = TestBed.inject(PermissionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should load user permissions', (done) => {
    const mockPermissions = [Permission.EXPENSE_CREATE, Permission.EXPENSE_READ];

    service.loadUserPermissions().subscribe(permissions => {
      expect(permissions).toEqual(mockPermissions);
      done();
    });

    const req = httpMock.expectOne('/v1/scopes/me');
    req.flush({ success: true, data: { permissions: mockPermissions } });
  });

  it('should check permission correctly', () => {
    service['permissionsSubject'].next([Permission.EXPENSE_CREATE]);
    
    expect(service.hasPermission(Permission.EXPENSE_CREATE)).toBe(true);
    expect(service.hasPermission(Permission.EXPENSE_EXPORT)).toBe(false);
  });
});
```

#### E2E Tests

```typescript
// permission-flow.e2e-spec.ts
describe('Permission Flow', () => {
  it('should show upgrade prompt when accessing locked feature', () => {
    // Login as free user
    cy.login('free@example.com', 'password');
    
    // Try to export expenses
    cy.visit('/expenses');
    cy.get('[data-test="export-button"]').click();
    
    // Should show upgrade prompt
    cy.get('app-upgrade-prompt').should('be.visible');
    cy.contains('Pro Plan Required').should('be.visible');
  });

  it('should hide features without permission', () => {
    cy.login('user@example.com', 'password');
    
    cy.visit('/admin');
    
    // Admin panel should not be visible
    cy.get('[data-test="admin-panel"]').should('not.exist');
  });
});
```

---

## 📊 ملخص الخطوات

| # | الخطوة | المدة | الأولوية |
|---|--------|-------|----------|
| 1 | إعداد البنية الأساسية | 4-6 ساعات | عالية جداً |
| 2 | Permission Service | 6-8 ساعات | عالية جداً |
| 3 | Plan Service | 4-6 ساعات | عالية جداً |
| 4 | Guards | 4-6 ساعات | عالية |
| 5 | Directives | 4-6 ساعات | عالية |
| 6 | Interceptors | 3-4 ساعات | عالية |
| 7 | Shared Components | 8-10 ساعات | متوسطة |
| 8 | Admin Dashboard | 12-16 ساعات | متوسطة |
| 9 | Plans Pages | 10-12 ساعات | عالية |
| 10 | Profile & Permissions | 4-6 ساعات | متوسطة |
| 11 | Update Existing Pages | 8-12 ساعات | عالية |
| 12 | Testing & Optimization | 6-8 ساعات | عالية |

**المجموع:** 73-100 ساعة عمل

---

## 🎯 أفضل الممارسات

### 1. Security

- ✅ **Never trust frontend checks alone** - دائماً تحقق من الصلاحيات في الباك إند
- ✅ **Cache permissions** - لتحسين الأداء
- ✅ **Invalidate cache** - عند تغيير الصلاحيات
- ✅ **Use Guards** - لحماية الـ routes
- ✅ **Use Directives** - لإخفاء/تعطيل العناصر

### 2. User Experience

- ✅ **Clear error messages** - رسائل واضحة ومفيدة
- ✅ **Upgrade prompts** - اقتراحات للترقية
- ✅ **Feature previews** - عرض الميزات المقفلة
- ✅ **Loading states** - حالات التحميل
- ✅ **Smooth transitions** - انتقالات سلسة

### 3. Performance

- ✅ **Cache permissions** - تخزين مؤقت للصلاحيات
- ✅ **Lazy loading** - تحميل كسول للصفحات
- ✅ **Optimize API calls** - تقليل الطلبات
- ✅ **Use observables** - للتحديثات التفاعلية

### 4. Maintainability

- ✅ **Centralized constants** - ثوابت مركزية
- ✅ **Reusable components** - مكونات قابلة لإعادة الاستخدام
- ✅ **Type safety** - استخدام TypeScript بشكل كامل
- ✅ **Documentation** - توثيق الكود

---

## 🚀 الخطوات التالية بعد التنفيذ

1. **Testing شامل** - اختبار جميع السيناريوهات
2. **Performance monitoring** - مراقبة الأداء
3. **User feedback** - جمع ملاحظات المستخدمين
4. **Iteration** - تحسين مستمر
5. **Documentation** - توثيق للمستخدمين

---

## 📞 الدعم

للأسئلة أو المساعدة:
- راجع الـ Backend API Reference
- راجع الـ Complete Guide
- تواصل مع فريق التطوير

---

**تاريخ الإنشاء:** 25 يوليو 2026  
**الإصدار:** 1.0.0  
**الحالة:** جاهز للتنفيذ ✅
