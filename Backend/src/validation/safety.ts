import { ValidationAction, ValidationActionType } from '../shared/types';
import { SandboxOptions } from '../sandbox/docker';

export interface SafetyDecision {
  status: 'ALLOWED' | 'REJECTED';
  reason?: string;
  sandboxOptions?: SandboxOptions;
  command?: string;
}

export class ValidationSafetyPolicy {
  public static evaluate(action: ValidationAction): SafetyDecision {
    const allowedTypes: ValidationActionType[] = ['STATIC_INSPECTION', 'BUILD', 'TEST', 'TARGETED_TEST', 'HEALTH_CHECK'];
    
    if (!allowedTypes.includes(action.type)) {
      return { status: 'REJECTED', reason: `Action type ${action.type} is not permitted.` };
    }

    // Default strict options based on V0.5 Sandbox restrictions
    const options: SandboxOptions = {
      networkEnabled: false,
      timeoutMs: 30000,
      memoryLimitMb: 512,
      cpus: 1.0,
      pidsLimit: 64
    };

    let command = '';

    switch (action.type) {
      case 'BUILD':
        command = 'npm run build';
        options.timeoutMs = 60000;
        options.memoryLimitMb = 1024;
        break;
      case 'TEST':
        command = 'npm test';
        options.timeoutMs = 60000;
        options.memoryLimitMb = 1024;
        break;
      case 'TARGETED_TEST':
        if (!action.target) return { status: 'REJECTED', reason: 'Targeted test requires a target file or regex' };
        if (/[;&|]/.test(action.target)) {
           return { status: 'REJECTED', reason: 'Target contains shell metacharacters' };
        }
        command = `npm test -- ${action.target}`;
        options.timeoutMs = 60000;
        options.memoryLimitMb = 1024;
        break;
      case 'STATIC_INSPECTION':
        if (!action.target) return { status: 'REJECTED', reason: 'Static inspection requires a target' };
        if (/[;&|]/.test(action.target)) {
           return { status: 'REJECTED', reason: 'Target contains shell metacharacters' };
        }
        command = `cat ${action.target}`;
        break;
      case 'HEALTH_CHECK':
        // For simplicity, we just see if it boots and stops, or run a check script
        command = 'npm run health';
        options.timeoutMs = 15000;
        break;
      default:
        return { status: 'REJECTED', reason: `Unhandled action type: ${action.type}` };
    }

    return {
      status: 'ALLOWED',
      sandboxOptions: options,
      command
    };
  }
}
