using CommunityToolkit.Mvvm.ComponentModel;

namespace SyncOps.Laundry.DesktopUI.Services;

public interface INavigationService
{
    ObservableObject? CurrentViewModel { get; }
    void NavigateTo<TViewModel>() where TViewModel : ObservableObject;
    event Action? CurrentViewModelChanged;
}

public class NavigationService : INavigationService
{
    private readonly Func<Type, ObservableObject> _viewModelFactory;
    private ObservableObject? _currentViewModel;

    public ObservableObject? CurrentViewModel => _currentViewModel;

    public event Action? CurrentViewModelChanged;

    public NavigationService(Func<Type, ObservableObject> viewModelFactory)
    {
        _viewModelFactory = viewModelFactory;
    }

    public void NavigateTo<TViewModel>() where TViewModel : ObservableObject
    {
        var vm = _viewModelFactory(typeof(TViewModel));
        _currentViewModel = vm;
        CurrentViewModelChanged?.Invoke();
    }
}
